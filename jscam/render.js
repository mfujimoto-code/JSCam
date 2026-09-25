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
		render.accum.update(frame, 'gray');
		const gray = render.accum.planes('gray')[0]
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
		render.accum.update(frame, 'rgb');
		const rgb = render.accum.planes('rgb')
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
});

render.buildImage = render.buildImageFuncs['RGB-frame'];

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
];

render.COLOR8 = [
	[127, 127, 127]
,	[255,   0,   0]
,	[  0, 255,   0]
,	[  0,   0, 255]
,	[255, 255,   0]
,	[255,   0, 255]
,	[  0, 255, 255]
,	[255, 255, 255]
];


// setup hop - operations for rendering histgram 
(() => {
	const	_hc = e('h-canvas')		// histogram overlay surface (ic bitmap, contain-scaled)
	,	_hGC = _hc.getContext('2d')
	;

	let	_color = 0;
	const	_rgba = ()=>{
		_color = (_color + 1) % render.COLOR8.length;
		const C = render.COLOR8[_color];
		return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',0.5)'
	};

	const	_drawHistogram = (frame, histogram) => {
		const	num = frame.num()
		,	max = histogram.reduce((a,b)=>(Math.max(a,b)), 0)
		,	barScale = (_hc.height / 3) / max
		,	lineScale = (_hc.height / 3) / num
		;

		_hGC.fillStyle = _rgba();
		for (let x = 10, i = 0; i < histogram.length; ++i, ++x) {
			const h = histogram[i] * barScale;
			_hGC.fillRect(x, _hc.height - 1 - h, 1, h);
		}
		let y = histogram[0];
		const yStart = _hc.height - 1;
		_hGC.strokeStyle = _rgba();
		_hGC.lineWidth = 2;
		_hGC.beginPath();
		_hGC.moveTo(10, yStart - y * lineScale);
		for (let x = 11, i = 1; i < histogram.length; ++i, ++x) {
			y += histogram[i];
			_hGC.lineTo(x, yStart - y * lineScale);
		}
		_hGC.stroke();
	};

	const	_clearHistogram = () => {
		_hGC.clearRect(0, 0, _hc.width, _hc.height);
		_color = 0;
	};

	const	_fit = (size) => {
		if (_hc.width == size[0] && _hc.height == size[1]) 
			return

		_hc.width  = size[0];
		_hc.height = size[1];
	};

	render.hop = {
		draw:	_drawHistogram
	,	clear:	_clearHistogram
	,	fit:	_fit
	};
})();

// setup iop - operations for rendering histgram 
(() => {
	const	_canvas = ()=>(document.createElement('canvas'))
	,	_ic = _canvas()	// back-buffer surface
	,	_zc = _canvas()	// off screen surface for zooming
	;
	const	_getGC = (canvas) => (
			canvas.getContext(
				'2d'
			,	{willReadFrequently: true}
			)
		)
	,	_iGC = _getGC(_ic)
	,	_zGC = _getGC(_zc)
	;
	const	_fitIC = (size) => {
			if (_ic.width == size[0] && _ic.height == size[1]) 
				return

			_ic.width  = size[0];
			_ic.height = size[1];
		}
	,	_fitZC = (size) => {
			if (_zc.width == size[0] && _zc.height == size[1]) 
				return

			_zc.width  = size[0];
			_zc.height = size[1];
		}
	,	_fit = (size) => {
		_fitIC(size);
		_fitZC(size);
	};

	const _frame = (frame) => {
		const	id = render.buildImage(_ic, frame);

		if (id.width == _ic.width && id.height == _ic.height) {
			_iGC.putImageData(id, 0, 0);
			return
		}

		_zGC.putImageData(id, 0, 0);
		_iGC.drawImage(_zc
		,              0, 0, id.width, id.height
		,              0, 0, _ic.width, _ic.height
		);
	};

	let _lastOffset = [0, 0];
	const _imageData = (src, scale, offset) => {
		if (scale === undefined
		||  scale === 1) {
			_iGC.drawImage(src, 0, 0, _ic.width, _ic.height);
			return _iGC.getImageData(0, 0, _ic.width, _ic.height)
		}

		if (scale <= 0 ||  scale > 1)
			throw new Error('not supported ' + scale.toString())
		
		const	sw = (_ic.width * scale) | 0
		,	sh = (_ic.height * scale) | 0
		;
		let	sx = (_ic.width * 0.5 - sw * 0.5) | 0
		,	sy = (_ic.height * 0.5 - sh * 0.5) | 0
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
			} else if (nx + sw > _ic.width) {
				ox = (_ic.width - sw) - sx
				sx = _ic.width - sw;
			} else	sx = nx;
			if (ny < 0) {
				oy = -sy
				sy = 0;
			} else if (ny + sh > _ic.height) {
				oy = (_ic.height - sh) - sy
				sy = _ic.height - sh;
			} else	sy = ny;
			_lastOffset = [ox, oy];
		}

		_iGC.drawImage(src
		,              sx, sy, sw, sh			               
		,              0,  0,   sw, sh);

		return _iGC.getImageData(0, 0, sw, sh)
	};

	render.iop = {
		fit:        _fit
	,	frame:      _frame
	,	imageData:  _imageData
	,	lastOffset: ()=>(_lastOffset)
	,	canvas:     ()=>(_ic)
	};
})();

// setup render.dop - operators for rendering image surface
(() => {
	const	_dc = e('d-canvas')		// display surface (image)
	,	_dGC = _dc.getContext('2d')
	,	_state = Object.create(null);
	;

	// matrix operation for drawing display surface
	const	_loadIdentity = () => {
			// reset to identity 
			// (a, b, c, d, e, f) means
			// a  c  e
			// b  d  f
			// 0  0  1
			// 
			// So, this will set matrix as follows
			// 1  0  0
			// 0  1  0
			// 0  0  1
			_dGC.setTransform(1, 0, 0, 1, 0, 0);
		}
	,	_flip = (yes) => {
			_loadIdentity();

			_state.flip = yes;
			if (!yes) return
			_dGC.translate(_dc.width, 0);
			_dGC.scale(-1, 1);
		}
	,	 _fit = (size) => {
			if (_dc.width != size[0] && _dc.height != size[1])
				return

			cUI.print('image size:' + size[0] + 'x' + size[1]);
			_dc.width  = size[0];
			_dc.height = size[1];

			_loadIdentity();
			if (_state.flip) _flip(true);
		}
	;

	const _show = () => {
		_dGC.drawImage(
			render.iop.canvas()
		,	0, 0, _dc.width, _dc.height);
	}

	render.dop = {
		show:	_show
	,	flip:	_flip
	,	fit:	_fit
	};

	const	_reset = () => {
		_loadIdentity();
		_state.flip = false;
	}

	_reset();
})();


render.resize = function (disp, internal) {
	if (!(disp instanceof Array)
	||  !(internal instanceof Array))
		throw new Error('invalid param');

	render.dop.fit(disp);
	render.iop.fit(internal);
	render.hop.fit(internal);
}

render.accum = new Accum();
