'use strict';

const dispatch = ()=>{
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

	if (dispatch.paused)	// don't kick, it will re-kicked at resume.
		return

	dispatch.kick();
}

(()=>{
	const	_stage = e('layers')
	,	_layer = e('dcanvas-layer')
	,	_video = e('video')
	,	_ds = new Surface(e('d-canvas'))	// display surface (image)
	,	_is = new Surface(null, null, true)	// internal  surface (image)
	,	_hs = new Surface(e('h-canvas'))	// histogram surface
	;

	const	_stat = {
			rAF: 0
		,	viewed: 0
		,	rVFC: 0
		,	iDISP: 0
		,	reset: ()=>{
				_stat.rAF    = 0;
				_stat.viewed = 0;
				_stat.iDISP  = 0;
			}
		,	inc: (prop)=>{
				_stat[prop] = (_stat[prop] + 1) >>> 0
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

		if (resizeBitmap) {
			_ds.fit(disp);
			_is.fit([_video.videoWidth, _video.videoHeight]);
			_hs.fit(disp);
		}

		return disp
	};

	const _displayResize = new ResizeObserver(()=>{
		_layoutDisplay(false);
	});

	_displayResize.observe(_stage);

	let	_scale = 1
	,	_scaleStep = 0
	,	_offset = [0.0, 0.0]
	,	_changed = false
	,	_vx = 1.0
	,	_vy = 1.0
	;

	const	_xscale = (r, is)=>{
		if (r.width <= 0) return 1.0
		return is[0] * _scale / r.width
	};
	const	_yscale = (r, is)=>{
		if (r.height <= 0) return 1.0
		return is[1] * _scale / r.height
	};
	dispatch.move = (x, y) => {
		const	r = _ds.clientRect()
		,	is = _is.shape()
		,	xscale = _xscale(r, is)
		,	yscale = _yscale(r, is)
		;
		_offset[0] -= x * _vx * xscale;
		_offset[1] -= y * _vy * yscale;
		_changed = true;
	}
	dispatch.move.flip = (yes) => {
		_vx = yes ? -1.0 : 1.0;
		_ds.gFlip(yes);
	};

	dispatch.zoom = (dir)=>{
		const	SCALE_MIN = 1/32
		,	SCALE_FACTOR = 1.1
		;

		if (dir === 0) return

		let step = _scaleStep;
		if (dir > 0) {
			if (step <= 0) return

			_scale = 1 / Math.pow(SCALE_FACTOR, --step);
			_scaleStep = step;
			_changed = true;
			return
		}

		const scale = 1 / Math.pow(SCALE_FACTOR, ++step);
		if (scale <= SCALE_MIN) return

		_scale = scale;
		_scaleStep = step;
		_changed = true;
		return
	}

	let _AFkicked = false;

	dispatch.kick = (noskip)=>{
		if (noskip !== undefined && noskip)
			_changed = true;

		if (_AFkicked) return

		_AFkicked = true;
		requestAnimationFrame(()=>{
			_AFkicked = false;
			_stat.inc('rAF');
			dispatch();
		});
	}

	dispatch.iDISP = (function * () {
		let	suggestion = 0
		,	begin = performance.now()
		;
		const	snap = new Surface(
			_video
		,	[_video.videoWidth, _video.videoHeight]
		,	true
		,	true
		);

		while (true) {
			_stat.iDISP += performance.now() - begin;
			yield suggestion;
			begin = performance.now();

			suggestion = 0;

			if (_video.videoWidth == 0 || _video.videoHeight == 0) {
				suggestion = 100;
				continue
			}

			const dispSize = _layoutDisplay(true);
			if (!dispSize) {
				suggestion = 100;
				continue
			}

			if (!dispatch.watcher.video.changed() && !_changed)
				continue

			_changed = false;
			_stat.inc('viewed');

			snap.fit([_video.videoWidth, _video.videoHeight]);
			snap.show(_video);

			const	extract = snap.extract(_scale, _offset)
			,	srcImage = extract[0]
			;
			_offset[0] = extract[1];
			_offset[1] = extract[2];

			const	newFrame = new Frame(srcImage, _video.currentTime)
			,	di = render.buildImage(null, newFrame)
			;

			_is.inject(di);
			_ds.show(_is);

			if (!dispatch.showHistogram)
				continue

			_hs.gClear();
			_hs.gBeginHistogram(newFrame.num());
			for (let k in newFrame.histogram) {
				_hs.gDrawHistogram(newFrame.histogram[k]);
			}
			_hs.gEndHistogram();
		}
	})();	// end dispatch.iDISP

	dispatch.duration = 0;
	dispatch.paused = false;
	dispatch.showHistogram = true;
	dispatch.lastProcessedEnd = 0;
	dispatch.lastSuggestion = 0;

	dispatch.watcher = {video:{}, fps:{}};
	(()=>{	// begin video watcher 
		const	_wv = dispatch.watcher.video
		,	_AFACTOR = (1/4)
		;

		if (!_video.requestVideoFrameCallback) {
			_wv.kick = ()=>{};
			_wv.changed = ()=>(true);
			_wv.duration = ()=>(1/30);
			return
		}

		let	_lastVFCCount = 0
		,	_lastVFC = performance.now()
		,	_emaVFC = 1
		;

		const _rVFC = () => {
			const	now = performance.now()
			,	d = now - _lastVFC
			;
			_emaVFC = (1 - _AFACTOR) * _emaVFC + _AFACTOR * d * 0.001;
			_lastVFC = now;
			_wv.kick();
		};

		_wv.duration = ()=>(_emaVFC);

		let	_VFCkicked = false;
		_wv.kick = () => {
			if (_VFCkicked) return
			_VFCkicked = true;
			_video.requestVideoFrameCallback(()=>{
				_VFCkicked = false;
				_stat.inc('rVFC');
				_rVFC();
			});
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

		const	_cs = new Surface(e('fps-chart'));

		const	_caption = e('fps-caption')
		,	_emaStat = {rAF:0, viewed:0, iDISP:0}
		,	_AFACTOR = 0.2
		,	_ema = (a, b) => ((1 - _AFACTOR) * a + _AFACTOR * b)
		,	_STEP = 2
		,	_low = (_cs.shape()[0] / _STEP)|0
		,	_high = (_low * 1.5)|0
		,	_values = []
		;
		let	_max = -Infinity;

		_cs.gFillStyle('rgba(255,0,255,0.5)');

		const _update = (duration)=>{
			const 	factor = 1 / duration;

			_emaStat.rAF = _ema(_emaStat.rAF, _stat.rAF * factor);
			_emaStat.viewed = _ema(_emaStat.viewed, _stat.viewed * factor);
			_emaStat.iDISP = _ema(_emaStat.iDISP, _stat.iDISP * factor);

			_values.push(_emaStat.iDISP);
			(_max < _emaStat.iDISP) && (_max = _emaStat.iDISP);
			if (_values.length > _high) {
				while (_values.length > _low) {
					_values.shift();
				}
				_max = _values.reduce((a,b)=>(Math.max(a,b)));
			}
		};

		const _showText = ()=>{
			_caption.textContent =
				'out:'
			+	(Math.round(_emaStat.rAF * 1000))
			+	' in:'
			+	(Math.round(1 / dispatch.watcher.video.duration()))
			+	' view:'
			+	((_emaStat.rAF > 0) ? Math.round(_emaStat.viewed / _emaStat.rAF * 100): 0)
			+	'% cpu:'
			+	(Math.round(_emaStat.iDISP * 100))
			+	'%'
			;
		};

		const _showChart = ()=>{
			const	shape = _cs.shape()
			,	cw = shape[0]
			,	ch = shape[1]
			;
			const scale = (_max == 0) ? 0 : ch / Math.abs(_max);
			_cs.gClear();
			_cs.gFillRect(0, ch - 1, cw, 1);
			for (let x = cw - _STEP
			     ,   i = _values.length - 1;
			     x >= 0 && i >= 0;
			     --i, x -= _STEP) {
				const h = (Math.abs(_values[i]) * scale)|0;
				_cs.gFillRect(x, ch - h, _STEP, h);
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
