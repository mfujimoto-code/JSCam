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

dispatch.fitDisplaySize = (videoW, videoH)=>{
	const stage = e('layers');
	const cs = getComputedStyle(stage);
	const maxW = Math.max(1,
		stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight));
	const maxH = Math.max(1,
		stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom));
	const scale = Math.min(maxW / videoW, maxH / videoH);
	return [
		Math.max(1, Math.floor(videoW * scale)),
		Math.max(1, Math.floor(videoH * scale))
	];
}

dispatch.layoutDisplay = (video, resizeBitmap)=>{
	if (!video || video.videoWidth == 0 || video.videoHeight == 0) return null;
	const disp = dispatch.fitDisplaySize(video.videoWidth, video.videoHeight);
	const layer = e('dcanvas-layer');
	layer.style.width = disp[0] + 'px';
	layer.style.height = disp[1] + 'px';
	layer.style.aspectRatio = 'auto';
	if (resizeBitmap) render.resize(disp, [video.videoWidth, video.videoHeight]);
	return disp;
}

dispatch.displayResize = new ResizeObserver(()=>{
	dispatch.layoutDisplay(e('video'), false);
});

dispatch.displayResize.observe(e('layers'));

dispatch._scale = 1;
dispatch._scaleStep = 0;

dispatch._offset = [0, 0];
dispatch._stat = {
	rAF:0
,	frame:0
,	reset: ()=>{
		const s = dispatch._stat;
		s.rAF = 0;
		s.frame = 0;
	}
};

dispatch.move = (x, y) => {
	dispatch._offset[0] -= x * dispatch.move._vx;
	dispatch._offset[1] -= y * dispatch.move._vy;
}
dispatch.move._vx = 1;
dispatch.move._vy = 1;
dispatch.move.flip = (yes) => {
	if (!yes) {
		dispatch.move._vx = 1;
		return
	}
	dispatch.move._vx = -1;
};

dispatch.zoom = (dir)=>{
	const	SCALE_MIN = 1/32
	,	SCALE_FACTOR = 1.1
	;

	if (dir === 0) return dispatch._scale;

	let step = dispatch._scaleStep;
	if (dir > 0) {
		if (step <= 0) return dispatch._scale

		dispatch._scale = 1 / Math.pow(SCALE_FACTOR, --step);
		dispatch._scaleStep = step;
		return dispatch._scale
	}

	const scale = 1 / Math.pow(SCALE_FACTOR, ++step);
	if (scale <= SCALE_MIN) return dispatch._scale

	dispatch._scale = scale;
	dispatch._scaleStep = step;
	return dispatch._scale
}

dispatch.kick = ()=>{
	requestAnimationFrame(dispatch);
	++dispatch._stat.rAF;
}

dispatch.iDISP = (function * () {
	const video = e('video');

	let	suggestion = 0
	,	scale = 0
	,	offset = [0, 0];

	while (true) {
		yield suggestion;
		suggestion = 0;

		if (video.videoWidth == 0 || video.videoHeight == 0) {
			suggestion = 100;
			continue;
		}

		const dispSize = dispatch.layoutDisplay(video, true);
		if (!dispSize) {
			suggestion = 100;
			continue;
		}

		const	imageData = render.imageData(video, dispatch._scale, dispatch._offset);
		dispatch._offset = render.lastOffset();

		const	doit = dispatch.showImage
			&&     (  dispatch.watcher.video.changed()
			       || scale != dispatch._scale
			       || offset[0] != dispatch._offset[0]
			       || offset[1] != dispatch._offset[1])
		;

		if (doit) {
			const	newFrame = new Frame(imageData, video.currentTime);

			render.frame(newFrame);
			if (dispatch.showHistogram) {
				render.clearHistogram();
				render.histogram.color = 0;
				for (let k in newFrame.histogram) {
					render.histogram(newFrame, newFrame.histogram[k]);
				}
			} else {
				render.clearHistogram();
			}
			render.show();

			++dispatch._stat.frame;
		}

		scale = dispatch._scale;
		offset[0] = dispatch._offset[0];
		offset[1] = dispatch._offset[1];
	}
})();

dispatch.duration = 0;
dispatch.paused = false;
dispatch.showImage = true;
dispatch.showHistogram = true;
dispatch.lastProcessedEnd = 0;
dispatch.lastSuggestion = 0;

dispatch.watcher = {}

dispatch.watcher.video = {};

(()=>{
	const	v = e('video')
	,	wv = dispatch.watcher.video
	,	AFACTOR = 0.2
	;

	if (!v.requestVideoFrameCallback) {
		wv.kick = ()=>{};
		wv.changed = ()=>(true);
		wv.duration = ()=>(1/30);
		return;
	}

	let	counter = 0
	,	lastCounter = 0
	,	lastTime = performance.now()
	,	kicked = false
	,	duration = 1
	;

	const rVFC = () => {
		const now = performance.now();
		kicked = false;
		++counter;
		duration = (1 - AFACTOR) * duration + AFACTOR * (now - lastTime) * 0.001;
		lastTime = now;
		wv.kick();
	};

	wv.duration = ()=>(duration);

	wv.kick = () => {
		if (wv._kicked) return;
		kicked = true;
		v.requestVideoFrameCallback(rVFC);
	};

	wv.changed = () => {
		const l = lastCounter;
		lastCounter = counter;
		return counter > l
	};
})();

dispatch.watcher.fps = ()=>{
	dispatch.watcher.fps.iFPS.next();
}
dispatch.watcher.fps.iFPS = (function * () {
	const	AFACTOR = 0.2
	,	STEP = 2
	,	COLOR = 'rgba(255,0,255,0.5)'
	,	canvas = e('fps-chart')
	,	caption = e('fps-caption')
	,	low = Math.round(canvas.width / STEP)
	,	high = Math.round(low * 1.5)
	,	gc = canvas.getContext('2d')
	,	values = []
	,	stat = dispatch._stat
	,	ema = {rAF:0, frame:0}
	;

	let last = performance.now();

	gc.fillStyle = COLOR;

	let max = -Infinity;
	while (true) {
		yield;
		const now = performance.now();

		const duration = now - last;
		last = now;

		if (duration <= 0) continue;

		const 	iDuration = 1 / duration;

		ema.rAF = (1 - AFACTOR) * ema.rAF + AFACTOR * (stat.rAF * 1000 * iDuration);
		ema.frame = (1 - AFACTOR) * ema.frame + AFACTOR * (stat.frame * 1000 * iDuration);
		values.push(ema.rAF);
		(max < ema.rAF) && (max = ema.rAF);
		if (values.length > high) {
			while (values.length > low) {
				values.shift();
			}
			max = values.reduce((a,b)=>(Math.max(a,b)));
		}

		caption.textContent =
			'out-fps:'
		+	Math.round(ema.rAF)
		+	' in-fps:'
		+	Math.round(1 / dispatch.watcher.video.duration())
		+	' view:'
		+	((ema.rAF > 0) ? Math.round(ema.frame / ema.rAF * 100) : 0)
		+	'%'
		;

		const scale = (max == 0) ? 0 : canvas.height / Math.abs(max);
		gc.clearRect(0, 0, canvas.width, canvas.height);
		gc.fillRect(0, canvas.height - 1, canvas.width, 1);
		for (let x = canvas.width - STEP
		     ,   i = values.length - 1;
		     x >= 0 && i >= 0;
		     --i, x -= STEP) {
			const h = Math.floor(Math.abs(values[i]) * scale);
			gc.fillRect(x, canvas.height - h, STEP, h);
		}

		stat.reset();
	}
})();

dispatch.watcher.fps.last = performance.now();

dispatch.kick();
dispatch.watcher.video.kick();
