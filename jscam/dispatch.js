'use strict';

const dispatch = ()=>{
	if (dispatch.paused)	// don't kick, it will re-kicked at resume.
		return

	const now = performance.now();

	if (now - dispatch.watch.last >= 500) {
		dispatch.watch.last = now;
		dispatch.watch();
	}

	const minWait = Math.max(dispatch.duration, dispatch.lastSuggestion);
	if (now - dispatch.lastProcessedEnd < minWait) {
		dispatch.kick();
		return
	}

	const r = dispatch.iDISP.next();
	dispatch.lastSuggestion = r.value;
	dispatch.lastProcessedEnd = performance.now();
	// suggestion==100 is camera/layout idle, not a capture/processing frame
	if (r.value != 100) dispatch.count.value++;

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
}

dispatch.iDISP = (function * () {
	const video = e('video');

	let  suggestion = 0;
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

		const t0 = performance.now();
		const imageData = render.imageData(video, dispatch._scale);
		const t1 = performance.now();

		const newFrame = new Frame(imageData);
		let t2 = performance.now()
		,   t3 = t2
		,   t4 = t2
		;

		if (dispatch.showImage) {
			render.frame(newFrame);
			t2 = performance.now();
			if (dispatch.showHistogram) {
				render.clearHistogram();
				render.histogram.color = 0;
				for (let k in newFrame.histogram) {
					render.histogram(newFrame, newFrame.histogram[k]);
				}
			} else {
				render.clearHistogram();
			}
			t3 = performance.now();
			render.show();
			t4 = performance.now();
		}

		dispatch.time.getImage += t1 - t0;
		dispatch.time.frame += t2 - t1;
		dispatch.time.histogram += t3 - t2;
		dispatch.time.show += t4 - t3;
		dispatch.time.n++;
	}
})();
dispatch.duration = 0;
dispatch.paused = false;
dispatch.count = {'value':0};
dispatch.showImage = true;
dispatch.showHistogram = true;
dispatch.lastProcessedEnd = 0;
dispatch.lastSuggestion = 0;
dispatch.time = {
	getImage: 0
	, frame: 0
	, histogram: 0
	, show: 0
	, n: 0
};


dispatch.watch = ()=>{
	dispatch.watch.iFPS.next();
	const n = dispatch.time.n;
	if (n > 0) {
		const avg = (k)=>(dispatch.time[k] / n).toFixed(1);
		e('fps-caption').innerText +=
			'  get ' + avg('getImage')
			+ ' frm ' + avg('frame')
			+ ' hist ' + avg('histogram')
			+ ' show ' + avg('show');
	}
	dispatch.time.getImage = 0;
	dispatch.time.frame = 0;
	dispatch.time.histogram = 0;
	dispatch.time.show = 0;
	dispatch.time.n = 0;
}
dispatch.watch.iFPS = Graph(
	dispatch.count
	, 'FPS'
	, 'fps-chart'
	, 'fps-caption'
	, 'rgba(255,0,255,0.5)'
);
dispatch.watch.last = performance.now();

dispatch.kick();
