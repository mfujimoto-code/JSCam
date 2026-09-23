'use strict';

const buildImageFuncs = Object.assign(Object.create(null), {
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
	, 'GRAY-Histogram equalization': function (ic, frame) {
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
	, 'YUV-frame': function (ic, frame) {
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
	, 'UV:RG-frame': function (ic, frame) {
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
	, 'RGB-frame': function (ic, frame) {
		return frame.get('ImageData');
	}
	, 'GRAY-accum': function (ic, frame) {
		accum.update(frame, 'gray');
		const gray = accum.planes('gray')[0]
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
	, 'RGB-accum': function (ic, frame) {
		accum.update(frame, 'rgb');
		const rgb = accum.planes('rgb')
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
	, 'BW-delta': function (ic, frame) {
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
	, 'Gray-delta': function (ic, frame) {
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
	, '8colors': function (ic, frame) {
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
	, 'Edge(Laplacian)': function (ic, frame) {
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
	, 'Edge(Laplacian signed)': function (ic, frame) {
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
	, 'Edge(Sobel)': function (ic, frame) {
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
	, 'Edge4(Sobel)': function (ic, frame) {
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
	, 'Edge2(Sobel)': function (ic, frame) {
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
	, 'Edge(Bin)': function (ic, frame) {
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

const render = Object.assign(Object.create(null), {
	buildImage: buildImageFuncs['RGB-frame']
	, canvas: function(width, height) {
		const c = document.createElement('canvas');
		c.width = width;
		c.height = height;
		return c
	}
	, image: function(frame) {
		const size = frame.size();
		return new ImageData(size[0], size[1])
	}
	, L4: [ 0
	      , 255/3
	      , 255/3*2
	      , 255]
	, COLOR8:[[127, 127, 127]
		, [255,   0,   0]
		, [  0, 255,   0]
		, [  0,   0, 255]
		, [255, 255,   0]
		, [255,   0, 255]
		, [  0, 255, 255]
		, [255, 255, 255]
		]
	, histogram: function (frame, histogram) {
		const hc = render.hc
		,     gc = hc.getContext('2d')
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
	, clearHistogram: function () {
		const hc = render.hc;
		hc.getContext('2d').clearRect(0, 0, hc.width, hc.height);
	}
	, frame: function (frame) {
		const ic = render.ic
		,     ictx = ic.getContext('2d')
		,     id = render.buildImage(ic, frame)
		;

		if (id.width == ic.width && id.height == ic.height) {
			ictx.putImageData(id, 0, 0);
			return
		}

		const zc = render.zc
		,     zctx = zc.getContext('2d')
		;
		zctx.putImageData(id, 0, 0);
		ictx.drawImage(zc, 0, 0, id.width, id.height, 0, 0, ic.width, ic.height);
	}
	, imageData: function (src, scale) {
		const ic = render.ic;
		const ictx = ic.getContext('2d');
		if (scale === undefined
		||  typeof(scale) != 'number'
		||  scale === 1) {
			ictx.drawImage(src, 0, 0, ic.width, ic.height);
			return ictx.getImageData(0, 0, ic.width, ic.height)
		}

		if (scale <= 0 ||  scale > 1)
			throw new Error('not supported ' + scale.toString())

		const sw = (ic.width * scale) | 0
		,     sh = (ic.height * scale) | 0
		,     sx = (ic.width * 0.5 - sw * 0.5) | 0
		,     sy = (ic.height * 0.5 - sh * 0.5) | 0
		;
		ictx.drawImage(src
		,              sx, sy, sw, sh			               
		,              0,  0,  sw, sh);

		return ictx.getImageData(0, 0, sw, sh)
	}
	, show: function () {
		const dc = render.dc;
		const dctx = dc.getContext('2d');
		dctx.drawImage(render.ic, 0, 0, dc.width, dc.height);
	}
	, resize: function (disp, internal) {
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
})

render.ic = render.canvas(640, 480);	// back-buffer surface
render.zc = render.canvas(640, 480);	// off screen surface for zooming
render.dc = e('d-canvas');		// display surface (image)
render.hc = e('h-canvas');		// histogram overlay surface (ic bitmap, contain-scaled)
