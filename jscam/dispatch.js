'use strict';

jsCam.initFn.push((kparam)=>{
const	_j = jsCam;

const dispatch = ()=>{
	dispatch._doit();
}

_j.dispatch = dispatch;

const	_stage = _j.e(kparam.topLayer)
,	_layer = _j.e(kparam.imageLayer)
,	_video = _j.e(kparam.srcVideo)
,	_ds = new _j.Surface(_j.e(kparam.displaySurface))
,	_is = new _j.Surface(null, null, true)
,	_hs = new _j.Surface(_j.e(kparam.overlaySurface))
,	_WATCH = 500
;

const	_ID_OK_MOVE_ON = 0
,	_ID_YOU_ARE_NOT_READY = 100
,	_TIME_QUANTUM = 20
;

let	_showHistogram    = true
,	_duration         = 0
,	_lastSuggestion   = 0
,	_lastProcessedEnd = 0
,	_paused           = false
;

const _getter = {
	'showHistogram': ()=>(_showHistogram)
,	'duration':      ()=>(_duration)
,	'pause':         ()=>(_paused)
};
const _setter = {
	'showHistogram': (v)=>(_showHistogram = v)
,	'duration':      (v)=>(_duration      = v)
,	'pause':         (v)=>(_paused        = v)
};
dispatch.get = (tag)=>{
	const fn = _getter[tag];
	if (!fn)
		throw new Error('not supported ' + tag)
	return fn()
};
dispatch.set = (tag, value)=>{
	const fn = _setter[tag];
	if (!fn)
		throw new Error('not supported ' + tag)
	fn(value);
	_scheduleReset();
};

dispatch._doit = ()=>{
	const now = performance.now();

	const minWait = Math.max(_duration, _lastSuggestion);
	if (now - _lastProcessedEnd < minWait) {
		dispatch.kick();
		return
	}

	const r = dispatch.iDISP.next();
	_lastSuggestion = r.value;
	_lastProcessedEnd = performance.now();

	if (_paused)	// don't kick, it will re-kicked at resume.
		return

	dispatch.kick();
};

const _SNAPNUM = 5
,     _snap = [];
;
for (let i = 0; i < _SNAPNUM; ++i) {
	_snap.push(new _j.Surface(
		_video
	,	[_video.videoWidth, _video.videoHeight]
	,	true
	,	true
	));
}

const	_stat = {
		rAF:     0
	,	viewed:  0
	,	rVFC:    0
	,	running: 0
	,	reset: ()=>{
			_stat.rAF      = 0;
			_stat.rVFC     = 0;
			_stat.viewed   = 0;
			_stat.running  = 0;
		}
	}
;

let	_scale = 1
,	_scaleStep = 0
,	_offset = [0.0, 0.0]
,	_changed = false
,	_vx = 1.0
,	_vy = 1.0
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
		const dfit = _ds.fit(disp);
		if (dfit) _ds.show(_is);
		const ifit = _is.fit([_video.videoWidth, _video.videoHeight]);
		const hfit = _hs.fit(disp);

		_changed = _changed || dfit || ifit || hfit;
	}

	return disp
};

const _displayResize = new ResizeObserver(()=>{
	_layoutDisplay(false);
});

_displayResize.observe(_stage);

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
		const	begin = performance.now();
		_AFkicked = false;
		++_stat.rAF;
		dispatch();
		_stat.running += performance.now() - begin;
	});
}

let _resetScheduled = false;
const _pipeline = []
, _endMark = ()=>{throw new Error('should not be called')}
, __pCheck = ()=>{
	if (_video.videoWidth == 0 || _video.videoHeight == 0) 
		return _ID_YOU_ARE_NOT_READY

	const dispSize = _layoutDisplay(true);
	if (!dispSize)
		return _ID_YOU_ARE_NOT_READY;

	return _ID_OK_MOVE_ON
}
, _pCheckCondition = (context, me)=>{
	const s = context.suggestion = __pCheck();
	_pipeline.push(me);

	if (s === _ID_OK_MOVE_ON && _changed) {
		_changed = false;
		++_stat.viewed;
		return
	}

	// skip later in this cycle.
	while (_pipeline[0] !== _endMark) {
		const first = _pipeline.shift();
		_pipeline.push(first);
	}
}
, _pFetch = (context, me)=>{
	const shot = _snap.pop();
	_snap.unshift(shot);
	shot.fit([_video.videoWidth, _video.videoHeight]);
	shot.show(_video);
	context.snap = _snap;
	_pipeline.push(me);
}
, _pExtract = (context, me) => {
	const	extract = context.snap[0].extract(_scale, _offset)
	,	srcImage = extract[0]
	;
	_offset[0] = extract[1];
	_offset[1] = extract[2];

	const	newFrame = new _j.Frame(srcImage, _video.currentTime)
	context.currentFrame = newFrame;

	_pipeline.push(me);
}
, _pRender = (context, me) => {
	context.di = _j.render.buildImage(context.currentFrame) ;

	_pipeline.push(me);
}
, _pShow = (context, me) => {
	_is.inject(context.di);
	_ds.show(_is);

	_pipeline.push(me);
}
, __pHistogram = (context, me) => {
	const f = context.currentFrame;
	_hs.gClear();
	_hs.gBeginHistogram(f.num());
	f.histogram().forEach(
		(k)=>_hs.gDrawHistogram(f.histogram(k))
	);
	_hs.gEndHistogram();

	_pipeline.push(me);
}
, _pHistogram = (context, me) => {
	if (!_showHistogram) {	// don't push if it is disabled
		_hs.gClear();
		return
	}
	__pHistogram(context, __pHistogram);
}
, _pReset = (context, me)=>{
	if (_pipeline[0] !== _endMark) {
		const next = _pipeline.shift();
		_pipeline.unshift(me);
		_pipeline.unshift(next);
		return
	}
	_buildPipeline();
	_pipeline.unshift(_endMark);
	_resetScheduled = false;
}
, _scheduleReset = ()=>{
	if (_resetScheduled)
		return
	_resetScheduled = true;
	_pipeline.unshift(_pReset);
}
, _buildPipeline = ()=>{
	_pipeline.length = 0;
	_pipeline.push(
		_pCheckCondition
	,	_pFetch
	,	_pExtract
	,	_pRender
	,	_pShow
	,	_pHistogram
	);
}
;

const	_timeQuantum = ()=>(_timeQuantum.over());
	(()=>{
		let	tq = 1000
		,	last = performance.now()
		,	elapsed = 0
		;
		_timeQuantum.update = ()=>{
			const now = performance.now();
			tq = 0.9*tq + 0.1*(now - last);
			last = now;
		};
		_timeQuantum.over = ()=>{
			elapsed = performance.now() - last
			return elapsed > tq
		};
		_timeQuantum.tq = ()=>(tq);
		_timeQuantum.elapsed = ()=>(elapsed);
	})();

dispatch.timeQuantum = _timeQuantum;

dispatch.iDISP = (function * () {
	let	context = {
			suggestion: _ID_OK_MOVE_ON
		}
	;

	_buildPipeline();
	while (true) {
		yield context.suggestion;
		_timeQuantum.update();

		context = {
			suggestion: _ID_OK_MOVE_ON
		};

		_pipeline.push(_endMark);
		while (true) {
			const fn = _pipeline.shift();
			if (fn === _endMark)
				break
			fn(context, fn);

			if (_timeQuantum() && _pipeline[0] !== _endMark) {
				yield context.suggestion
				_timeQuantum.update();
			}
		}
	}
})();	// end dispatch.iDISP

dispatch.watcher = {video:{}, fps:{}};
(()=>{	// begin video watcher 
	const	_wv = dispatch.watcher.video;

	if (!_video.requestVideoFrameCallback) 
		throw new Error('not supported requestVideoFrameCallback')

	let	_VFCkicked = false;
	_wv.kick = () => {
		if (_VFCkicked) return
		_VFCkicked = true;
		_video.requestVideoFrameCallback(()=>{
			// With some UAs, canvas/video work here can make
			// rAF drawImage stop updating.
			// Keep this callback lightweight.
			const	begin = performance.now();
			_VFCkicked = false;
			++_stat.rVFC;
			_changed = true;
			_wv.kick();
			_stat.running += performance.now() - begin;
		});
	};
})();	// end video watcher

(()=>{	// begin fps watcher 
	const _wf = ()=>(dispatch.watcher.fps.iFPS.next());

	dispatch.watcher.fps = _wf;

	const	_cs = new _j.Surface(_j.e(kparam.fpsChart));

	const	_caption = _j.e(kparam.fpsCaption)
	,	_emaStat = {rAF:0, rVFC:0, viewed:0, running:0, obj:0}
	,	_AFACTOR = (1/4)
	,	_ema = (a, b) => ((1 - _AFACTOR) * a + _AFACTOR * b)
	,	_STEP = 2
	,	_low = (_cs.shape()[0] / _STEP)|0
	,	_high = (_low * 1.5)|0
	,	_values = []
	;
	let	_max = -Infinity;

	_cs.gFillStyle('rgba(255,0,255,0.5)');

	const _update = (duration)=>{
		const 	factor = 1 / duration
		,	oc = _j.monitor()[1]
		,	opv = _stat.viewed > 0 ? oc / _stat.viewed : oc
		;

		_emaStat.rAF     = _ema(_emaStat.rAF,     _stat.rAF     * factor);
		_emaStat.rVFC    = _ema(_emaStat.rVFC,    _stat.rVFC    * factor);
		_emaStat.viewed  = _ema(_emaStat.viewed,  _stat.viewed  * factor);
		_emaStat.running = _ema(_emaStat.running, _stat.running * factor);
		_emaStat.obj     = _ema(_emaStat.obj,     opv);

		_values.push(_emaStat.running);
		(_max < _emaStat.running) && (_max = _emaStat.running);
		if (_values.length > _high) {
			while (_values.length > _low) {
				_values.shift();
			}
			_max = _values.reduce((a,b)=>(Math.max(a,b)));
		}
	};

	const _showText = ()=>{
		const	viewRatio = ((_emaStat.rAF > 0)
			?	(_emaStat.viewed / _emaStat.rAF * 100)
			:	0)
		;
		_caption.textContent =
			'out/slice:' +((_emaStat.rAF * 1000).toFixed(1))
		+	'/' + (dispatch.timeQuantum.tq().toFixed(1))
		+	' in:' + ((_emaStat.rVFC * 1000).toFixed(1))
		+	' view:' + viewRatio.toFixed(0)
		+	'% run:' + ((_emaStat.running * 100).toFixed(0))
		+	'% obj:' + (_emaStat.obj.toFixed(0))
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
	
	_wf.kick = ()=>{
		setTimeout(()=>{
			_wf.iFPS.next();
			_wf.kick();
		}
		, _WATCH
		);
	};
})();	// end fsp watcher

dispatch.kick();
dispatch.watcher.video.kick();
dispatch.watcher.fps.kick();
});

