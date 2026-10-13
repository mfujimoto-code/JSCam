'use strict';

(()=>{

const _load = (pathArray, kicker)=>{
	if (!(pathArray instanceof Array))
		throw new Error('no path list')

	if (typeof kicker !== 'function') 
		throw new Error('no kicker')

	if (pathArray.length == 0) {
		kicker();
		return
	}

	const path = pathArray.shift();

	const script = document.createElement('script');
	script.src = path;

	script.onload = () => {
		_load(pathArray, kicker);
	};

	document.body.appendChild(script);
}

_load(
	[	'./cam2.js'
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
