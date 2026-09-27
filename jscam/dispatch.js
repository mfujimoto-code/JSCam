'use strict';

const dispatch = ()=>{
	if (dispatch.paused)	// don't kick, it will re-kicked at resume.
		return

	const now = performance.now();

	if (now - dispatch.watcher.fps.last >= 500) {
		dispatch.watcher.fps.last = now;
		dispatch.watcher.fps();
	}

	const minWait = Math.max(dispatch.duration, dispatch.lastSuggestion);
	if (now - dispatch.lastProcessedEnd < minWait) {
		dispatch.kick();
		return
	}

	const r = dispatch.iDISP.next();
	dispatch.lastSuggestion = r.value;
	dispatch.lastProcessedEnd = performance.now();

	dispatch.kick();
}

(()=>{
	const	_stage = e('layers')
	,	_layer = e('dcanvas-layer')
	,	_video = e('video')
	;

	const	_stat = {
			rAF: 0
		,	rVFC: 0
		,	frame: 0
		,	reset: ()=>{
				_stat.rAF = 0;
				_stat.frame = 0;
			}
		}
	;

	const  _fitDisplaySize = (videoW, videoH)=>{
		const cs = getComputedStyle(_stage);
		const maxW = Math.max(1,
			_stage.clientWidth
			- parseFloat(cs.paddingLeft)
			- parseFloat(cs.paddingRight));
		const maxH = Math.max(1,
			_stage.clientHeight
			- parseFloat(cs.paddingTop)
			- parseFloat(cs.paddingBottom));

		const	scale = Math.min(maxW / videoW, maxH / videoH)
		,	w = Math.max(1, Math.floor(videoW * scale))
		,	h = Math.max(1, Math.floor(videoH * scale))
		;
		return [w, h]
	};

	const _layoutDisplay = (resizeBitmap)=>{
		if (!_video
		||  _video.videoWidth == 0
		||  _video.videoHeight == 0
		)
			return null

		const disp = _fitDisplaySize(_video.videoWidth, _video.videoHeight);
		_layer.style.width = disp[0] + 'px';
		_layer.style.height = disp[1] + 'px';
		_layer.style.aspectRatio = 'auto';

		if (resizeBitmap)
			render.resize(disp, [_video.videoWidth, _video.videoHeight]);

		return disp
	};

	const _displayResize = new ResizeObserver(()=>{
		_layoutDisplay(false);
	});

	_displayResize.observe(_stage);

	let	_scale = 1
	,	_scaleStep = 0
	,	_offset = [0.0, 0.0]
	;

	const	_xscale = (r, is)=>{
			if (r.width <= 0) return 1.0
			return is[0] * _scale / r.width
		}
	,	_yscale = (r, is)=>{
			if (r.height <= 0) return 1.0
			return is[1] * _scale / r.height
		}
	;
	let	_vx = 1.0
	,	_vy = 1.0
	;
	dispatch.move = (x, y) => {
		const	r = render.dop.clientRect()
		,	is = render.iop.size()
		,	xscale = _xscale(r, is)
		,	yscale = _yscale(r, is)
		;
		_offset[0] -= x * _vx * xscale;
		_offset[1] -= y * _vy * yscale;
	}
	dispatch.move.flip = (yes) => {
		if (!yes) {
			_vx = 1.0;
			return
		}
		_vx = -1.0;
	};

	dispatch.zoom = (dir)=>{
		const	SCALE_MIN = 1/32
		,	SCALE_FACTOR = 1.1
		;

		if (dir === 0) return _scale;

		let step = _scaleStep;
		if (dir > 0) {
			if (step <= 0) return _scale

			_scale = 1 / Math.pow(SCALE_FACTOR, --step);
			_scaleStep = step;
			return _scale
		}

		const scale = 1 / Math.pow(SCALE_FACTOR, ++step);
		if (scale <= SCALE_MIN) return _scale

		_scale = scale;
		_scaleStep = step;
		return _scale
	}

	dispatch.kick = ()=>{
		requestAnimationFrame(dispatch);
		++_stat.rAF;
	}

	dispatch.iDISP = (function * () {
		let	suggestion = 0
		,	lastScale = 0
		,	offset = [0, 0];

		while (true) {
			yield suggestion;
			suggestion = 0;

			if (_video.videoWidth == 0 || _video.videoHeight == 0) {
				suggestion = 100;
				continue;
			}

			const dispSize = _layoutDisplay(true);
			if (!dispSize) {
				suggestion = 100;
				continue;
			}

			const	imageData = render.iop.imageData(_video, _scale, _offset);
			_offset = render.iop.lastOffset();

			const	doit = dispatch.showImage
				&&     (  dispatch.watcher.video.changed()
				       || lastScale != _scale
				       || offset[0] != _offset[0]
				       || offset[1] != _offset[1])
			;

			if (doit) {
				const	newFrame = new Frame(imageData, _video.currentTime);

				render.iop.frame(newFrame);

				if (dispatch.showHistogram) {
					render.hop.clear();
					for (let k in newFrame.histogram) {
						render.hop.draw(newFrame, newFrame.histogram[k]);
					}
				}

				render.dop.show();

				++_stat.frame;
			}

			lastScale = _scale;
			offset[0] = _offset[0];
			offset[1] = _offset[1];
		}
	})();	// end dispatch.iDISP

	dispatch.duration = 0;
	dispatch.paused = false;
	dispatch.showImage = true;
	dispatch.showHistogram = true;
	dispatch.lastProcessedEnd = 0;
	dispatch.lastSuggestion = 0;

	dispatch.watcher = {video:{}, fps:{}};
	(()=>{	// begin video watcher 
		const	_wv = dispatch.watcher.video
		,	_AFACTOR = 0.2
		;

		if (!_video.requestVideoFrameCallback) {
			_wv.kick = ()=>{};
			_wv.changed = ()=>(true);
			_wv.duration = ()=>(1/30);
			return
		}

		let	_lastVFCCount = 0
		,	_lastVFC = performance.now()
		,	_kicked = false
		,	_emaVFC = 1
		;

		const _rVFC = () => {
			const	now = performance.now()
			,	d = now - _lastVFC
			;
			_kicked = false;
			_stat.rVFC = (_stat.rVFC + 1) | 0;
			_emaVFC = (1 - _AFACTOR) * _emaVFC + _AFACTOR * d * 0.001;
			_lastVFC = now;
			_wv.kick();
		};

		_wv.duration = ()=>(_emaVFC);

		_wv.kick = () => {
			if (_kicked) return
			_kicked = true;
			_video.requestVideoFrameCallback(_rVFC);
		};

		_wv.changed = () => {
			const changed = _stat.rVFC != _lastVFCCount;
			_lastVFCCount = _stat.rVFC;
			return changed
		};
	})();	// end video watcher

	(()=>{	// begin fps watcher 
		const _wf = ()=>(dispatch.watcher.fps.iFPS.next());

		dispatch.watcher.fps = _wf;

		const	_fc = e('fps-chart')
		,	_gc = _fc.getContext('2d')
		,	_caption = e('fps-caption')
		,	_ema = {rAF:0, frame:0}
		,	_AFACTOR = 0.2
		,	_STEP = 2
		,	_COLOR = 'rgba(255,0,255,0.5)'
		,	_low = Math.round(_fc.width / _STEP)
		,	_high = Math.round(_low * 1.5)
		,	_values = []
		;
		let	_max = -Infinity;

		_gc.fillStyle = _COLOR;

		const _update = (duration)=>{
			const 	factor = 1 / duration * 1000
			,	frAF = _stat.rAF * factor
			,	fframe = _stat.frame * factor
			;

			_ema.rAF = (1 - _AFACTOR) * _ema.rAF + _AFACTOR * frAF;
			_ema.frame = (1 - _AFACTOR) * _ema.frame + _AFACTOR * fframe;
			_values.push(_ema.rAF);
			(_max < _ema.rAF) && (_max = _ema.rAF);
			if (_values.length > _high) {
				while (_values.length > _low) {
					_values.shift();
				}
				_max = _values.reduce((a,b)=>(Math.max(a,b)));
			}
		};

		const _showText = ()=>{
			_caption.textContent =
				'out-fps:'
			+	Math.round(_ema.rAF)
			+	' in-fps:'
			+	Math.round(1 / dispatch.watcher.video.duration())
			+	' view:'
			+	((_ema.rAF > 0) ? Math.round(_ema.frame / _ema.rAF * 100) : 0)
			+	'%'
			;
		};

		const _showChart = ()=>{
			const scale = (_max == 0) ? 0 : _fc.height / Math.abs(_max);
			_gc.clearRect(0, 0, _fc.width, _fc.height);
			_gc.fillRect(0, _fc.height - 1, _fc.width, 1);
			for (let x = _fc.width - _STEP
			     ,   i = _values.length - 1;
			     x >= 0 && i >= 0;
			     --i, x -= _STEP) {
				const h = Math.floor(Math.abs(_values[i]) * scale);
				_gc.fillRect(x, _fc.height - h, _STEP, h);
			}
		};

		_wf.iFPS = (function * () {

			let last = performance.now();

			while (true) {
				yield;
				const now = performance.now();

				const duration = now - last;
				last = now;

				if (duration <= 0) continue;

				_update(duration);
				_showText();
				_showChart();

				_stat.reset();
			}
		})();
		_wf.last = performance.now();

	})();	// end fsp watcher

})();

dispatch.kick();
dispatch.watcher.video.kick();
