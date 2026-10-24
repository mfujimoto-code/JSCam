'use strict';

(()=>{

const caption = document.getElementById('fps-caption');

const _progress = (ptext)=>{
	const caption = document.getElementById('fps-caption');
	caption.textContent = ptext;
}

const _error = (etext)=>{
	_progress(etext);
	throw new Error(etext)
}

const _load = (pathArray, kicker)=>{
	if (!(pathArray instanceof Array))
		_error('no path list');

	if (typeof kicker !== 'function') 
		_error('no kicker')

	_progress(`Loading ${pathArray.length}`);

	if (pathArray.length == 0) {
		_progress(`Starting`);
		kicker();
		return
	}

	const path = pathArray.shift();

	const script = document.createElement('script');
	script.src = path;

	script.onerror = () => {
		_error(`failed to load ${path}`);
	};

	script.onload = () => {
		_load(pathArray, kicker);
	};

	document.body.appendChild(script);
}

_load(
	[	'./cam2.js'
	,	'./monitor.js'
	,	'./image.js'
	,	'./frame.js'
	,	'./accum.js'
	,	'./delta.js'
	,	'./render.js'
	,	'./surface.js'
	,	'./dispatch.js'
	,	'./ui.js'
	,	'./camera.js'
	]
	, ()=>{
		jsCam.kick(
		{	topLayer:	'layers'
		,	imageLayer:	'dcanvas-layer'
		,	srcVideo:	'video'
		,	displaySurface:	'd-canvas'
		,	overlaySurface: 'h-canvas'
		,	fpsChart:	'fps-chart'
		,	fpsCaption:	'fps-caption'
		})
	}
);

})();
