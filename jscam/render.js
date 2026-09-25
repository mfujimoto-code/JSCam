'use strict';

const render = Object.create(null);

render.buildImageFuncs = Object.assign(Object.create(null), {
	'GRAY-frame': function (ic, frame) {
		const yuv = frame.get('yuv');
		const num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = yuv.Y[i];
			data[o+3] = 255;
		}
		return imageData;
	}
,	'GRAY-Histogram equalization': function (ic, frame) {
		const e = frame.get('equalized')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = e[i];
			data[o+3] = 255;
		}
		return imageData;
	}
	// R = 1.000Y          + 1.402V
	// G = 1.000Y - 0.344U - 0.714V
	// B = 1.000Y + 1.772U
,	'YUV-frame': function (ic, frame) {
		const yuv = frame.get('yuv')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const Y = yuv.Y[i]
			,     U = yuv.UV[i * 2]
			,     V = yuv.UV[i * 2 + 1]
			;
			data[o  ] = Y + 1.402*V;
			data[o+1] = Y - 0.344*U - 0.714*V;
			data[o+2] = Y + 1.772*U;
			data[o+3] = 255;
		}
		return imageData;
	}
,	'UV:RG-frame': function (ic, frame) {
		const yuv = frame.get('yuv')
		,     num  = frame.num() * 2
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; i += 2, o += 4) {
			const U = yuv.UV[i]
			, V = yuv.UV[i+1]
			;
			data[o  ] = U+128;
			data[o+1] = V+128;
			data[o+2] = 0;
			data[o+3] = 255;
		}
		return imageData;
	}
,	'RGB-frame': function (ic, frame) {
		return frame.get('ImageData');
	}
,	'GRAY-accum': function (ic, frame) {
		render.acc.update(frame, 'gray');
		const gray = render.acc.planes('gray')[0]
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = gray[i];
			data[o+3] = 255;
		}

		return imageData
	}
,	'RGB-accum': function (ic, frame) {
		render.acc.update(frame, 'rgb');
		const rgb = render.acc.planes('rgb')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] = rgb[0][i];
			data[o+1] = rgb[1][i];
			data[o+2] = rgb[2][i];
			data[o+3] = 255;
		}

		return imageData
	}
,	'BW-delta': function (ic, frame) {
		const d = delta.get(frame)
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const bw = (d[i] == 0) ? 0 : 255;
			data[o  ] =
			data[o+1] =
			data[o+2] = bw;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Gray-delta': function (ic, frame) {
		const d = delta.get(frame)
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = Math.abs(d[i]);
			data[o+3] = 255;
		}

		return imageData
	}
,	'8colors': function (ic, frame) {
		const num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		,     RGB = frame.get('rgb')
		,     R = RGB[0]
		,     G = RGB[1]
		,     B = RGB[2]
		,     tR = Frame.calcThreshold(frame.histogram['R'])
		,     tG = Frame.calcThreshold(frame.histogram['G'])
		,     tB = Frame.calcThreshold(frame.histogram['B'])
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o+0] = R[i] > tR ? 255 : 0;
			data[o+1] = G[i] > tG ? 255 : 0;
			data[o+2] = B[i] > tB ? 255 : 0;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge(Laplacian)': function (ic, frame) {
		const e = frame.get('laplacian')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = e[i];
			data[o  ] = C;
			data[o+1] = C;
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge(Laplacian signed)': function (ic, frame) {
		const e = frame.get('laplacian.signed')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = e[i];
			data[o  ] = C;
			data[o+1] = C;
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge(Sobel)': function (ic, frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = e[i];
			data[o  ] = C;
			data[o+1] = C;
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge4(Sobel)': function (ic, frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = render.L4[Math.floor(e[i] / 64)];
			data[o  ] = 
			data[o+1] = 
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge2(Sobel)': function (ic, frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = e[i] > 127 ? 255 : 0;
			data[o  ] = 
			data[o+1] = 
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge(Bin)': function (ic, frame) {
		const num  = frame.num()
		,     imageData = render.image(frame)
		,     data = imageData.data
		,     e = frame.get('sobel.rgb')
		,     t = Frame.calcThreshold(frame.histogram['sobel.rgb'])
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o+0] =
			data[o+1] =
			data[o+2] = e[i] > t ? 255 : 0;
			data[o+3] = 255;
		}

		return imageData
	}
})

render.buildImage = render.buildImageFuncs['RGB-frame']

render.canvas = function(width, height) {
	const c = document.createElement('canvas');
	c.width = width;
	c.height = height;
	return c
}

render.image = function(frame) {
	const size = frame.size();
	return new ImageData(size[0], size[1])
}

render.L4 = [
	0
, 	255/3
, 	255/3*2
,	255
]

render.COLOR8 = [
	[127, 127, 127]
,	[255,   0,   0]
,	[  0, 255,   0]
,	[  0,   0, 255]
,	[255, 255,   0]
,	[255,   0, 255]
,	[  0, 255, 255]
,	[255, 255, 255]
]

render.histogram = function (frame, histogram) {
	const hc = render.hc
	,     gc = render.hGC
	,     num = frame.num()
	,     max = histogram.reduce((a,b)=>(Math.max(a,b)), 0)
	,     barScale = (hc.height / 3) / max
	,     lineScale = (hc.height / 3) / num
	;

	const rgba = ()=>{
		!('color' in render.histogram) && (render.histogram.color = 0);
		render.histogram.color = (render.histogram.color + 1) % render.COLOR8.length;
		const C = render.COLOR8[render.histogram.color];
		return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',0.5)'
	}

	gc.fillStyle = rgba();
	for (let x = 10, i = 0; i < histogram.length; ++i, ++x) {
		const h = histogram[i] * barScale;
		gc.fillRect(x, hc.height - 1 - h, 1, h);
	}
	let y = histogram[0];
	const yStart = hc.height - 1;
	gc.strokeStyle = rgba();
	gc.lineWidth = 2;
	gc.beginPath();
	gc.moveTo(10, yStart - y * lineScale);
	for (let x = 11, i = 1; i < histogram.length; ++i, ++x) {
		y += histogram[i];
		gc.lineTo(x, yStart - y * lineScale);
	}
	gc.stroke();
}

render.clearHistogram = function () {
	render.hGC.clearRect(
		0
	,	0
	,	render.hc.width
	,	render.hc.height);
}

render.getGC = (canvas) => (
	canvas.getContext(
		'2d'
	,	{willReadFrequently: true}
	)
)

render.frame = function (frame) {
	const ic = render.ic
	,     iGC = render.iGC
	,     id = render.buildImage(ic, frame)
	;

	if (id.width == ic.width && id.height == ic.height) {
		iGC.putImageData(id, 0, 0);
		return
	}

	const zc = render.zc
	,     zGC = render.zGC
	;
	zGC.putImageData(id, 0, 0);
	iGC.drawImage(zc, 0, 0, id.width, id.height, 0, 0, ic.width, ic.height);
}

render.lastOffset = ()=>([0,0])

render.imageData = function (src, scale, offset) {
	const ic = render.ic;
	const iGC = render.iGC;
	if (scale === undefined
	||  scale === 1) {
		iGC.drawImage(src, 0, 0, ic.width, ic.height);
		return iGC.getImageData(0, 0, ic.width, ic.height)
	}

	if (scale <= 0 ||  scale > 1)
		throw new Error('not supported ' + scale.toString())
	
	const	sw = (ic.width * scale) | 0
	,	sh = (ic.height * scale) | 0
	;
	let	sx = (ic.width * 0.5 - sw * 0.5) | 0
	,	sy = (ic.height * 0.5 - sh * 0.5) | 0
	;

	if (offset !== undefined) {
		let	ox = offset[0]
		,	oy = offset[1]
		,	nx = sx + ox
		,	ny = sy + oy
		;
		if (nx < 0) {
			ox = -sx
			sx = 0;
		} else if (nx + sw > ic.width) {
			ox = (ic.width - sw) - sx
			sx = ic.width - sw;
		} else	sx = nx;
		if (ny < 0) {
			oy = -sy
			sy = 0;
		} else if (ny + sh > ic.height) {
			oy = (ic.height - sh) - sy
			sy = ic.height - sh;
		} else	sy = ny;
		render.lastOffset = ()=>([ox, oy])
	}

	iGC.drawImage(src
	,              sx, sy, sw, sh			               
	,              0,  0,   sw, sh);

	return iGC.getImageData(0, 0, sw, sh)
};

(() => {
	// setup matrix operation for drawing display surface
	const reset = (gc) => {
		// reset to identity 
		// (a, b, c, d, e, f) means
		// a  c  e
		// b  d  f
		// 0  0  1
		// 
		// So, this call will set matrix as follows
		// 1  0  0
		// 0  1  0
		// 0  0  1
		gc.setTransform(1, 0, 0, 1, 0, 0);
	}
	const setHFlip = (gc) => {
		gc.translate(render.dc.width, 0);
		gc.scale(-1, 1)
	}

	const mop = {};
	mop.flip = (yes) => {
		const gc = render.dGC;

		if (!yes) {
			reset(gc);
			return
		}

		setHFlip(gc);
		return
	}

	render.dt = mop;
})();

render.show = function () {
	const	dc = render.dc;
	render.dGC.drawImage(render.ic, 0, 0, dc.width, dc.height);
}

render.resize = function (disp, internal) {
	if (!(disp instanceof Array)
	||  !(internal instanceof Array))
		throw new Error('invalid param');

	if (render.dc.width != disp[0] || render.dc.height != disp[1]) {
		cUI.print('size = ' + disp[0] + 'x' + disp[1]);
		render.dc.width  = disp[0];
		render.dc.height = disp[1];
	}

	if (render.ic.width != internal[0] || render.ic.height != internal[1]) {
		render.ic.width  = internal[0];
		render.ic.height = internal[1];
	}

	if (render.zc.width != internal[0] || render.zc.height != internal[1]) {
		render.zc.width  = internal[0];
		render.zc.height = internal[1];
	}

	if (render.hc.width != internal[0] || render.hc.height != internal[1]) {
		render.hc.width  = internal[0];
		render.hc.height = internal[1];
	}
}

render.acc = new Accum();

render.ic = render.canvas(640, 480);	// back-buffer surface
render.zc = render.canvas(640, 480);	// off screen surface for zooming
render.dc = e('d-canvas');		// display surface (image)
render.hc = e('h-canvas');		// histogram overlay surface (ic bitmap, contain-scaled)

render.iGC = render.getGC(render.ic);
render.zGC = render.getGC(render.zc);
render.dGC = render.dc.getContext('2d');
render.hGC = render.hc.getContext('2d');
