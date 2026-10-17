'use strict';

jsCam.initFn.push((kparam)=>{
const _j = jsCam;

const render = Object.create(null);

_j.render = render;

const _L4 = [0, 255/3, 255/3*2, 255];

const _accum = new _j.Accum();

const _image = function(frame) {
	const size = frame.size()
	,     im = new ImageData(size[0], size[1])
	;
	_j.monitor(im);
	return im
}

const _u8clamp = new Uint8ClampedArray(1);
const _buildImageFuncs = Object.assign(Object.create(null), {
	'Raw(RGBA-packed)': function (frame) {
		return frame.get('ImageData');
	}
,	'RGB-planar': function (frame) {
		const	rgb = frame.get('rgb')
		,	imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['rgb', rgb]);
		return imageData
	}
,	'Red': function (frame) {
		const	plane = frame.get('red')
		,	imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['luminance', plane]);
		return imageData
	}
,	'Green': function (frame) {
		const	plane = frame.get('green')
		,	imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['luminance', plane]);
		return imageData
	}
,	'Blue': function (frame) {
		const	plane = frame.get('blue')
		,	imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['luminance', plane]);
		return imageData
	}
,	'GRAY': function (frame) {
		const	gray = frame.get('gray')
		,	imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['luminance', gray]);
		return imageData;
	}
,	'GRAY-Histogram equalization': function (frame) {
		const e = frame.get('equalized')
		,     imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['luminance', e]);
		return imageData;
	}
,	'YUV': function (frame) {
		const yuv = frame.get('yuv')
		,     imageData = _image(frame)
		;
		_j.image.convert(['rgba', imageData.data], ['yuv', yuv]);
		return imageData
	}
,	'GRAY-accum': function (frame) {
		_accum.update(frame, 'gray');
		const gray = _accum.planes('gray')[0]
		,     num  = frame.num()
		,     imageData = _image(frame)
		,     data = imageData.data
		,     gH = new Array(256)
		;

		let tlum = 0;
		gH.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const lum = gray[i];
			data[o  ] =
			data[o+1] =
			data[o+2] = lum;
			data[o+3] = 255;

			tlum += lum;
			gH[data[o]] += 1;
		}

		frame.updateStat('gray', gH, tlum);

		return imageData
	}
,	'RGB-accum': function (frame) {
		_accum.update(frame, 'rgb');
		const rgb = _accum.planes('rgb')
		,     num  = frame.num()
		,     imageData = _image(frame)
		,     data = imageData.data
		,     rH = new Array(256)
		,     gH = new Array(256)
		,     bH = new Array(256)
		;
		let tlR = 0
		,   tlG = 0
		,   tlB = 0
		;
		rH.fill(0);
		gH.fill(0);
		bH.fill(0);

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const r = rgb[0][i];
			const g = rgb[1][i];
			const b = rgb[2][i];
			data[o  ] = r;
			data[o+1] = g;
			data[o+2] = b;
			data[o+3] = 255;

			rH[data[o]  ] += 1;
			gH[data[o+1]] += 1;
			bH[data[o+2]] += 1;

			tlR += r;
			tlG += g;
			tlB += b;
		}

		frame.updateStat('red',   rH, tlR);
		frame.updateStat('green', gH, tlG);
		frame.updateStat('blue',  bH, tlB);

		return imageData
	}
,	'YUV-accum': function (frame) {
		_accum.update(frame, 'yuv');
		const	yuv = _accum.planes('yuv')
		,	Y = yuv[0]
		,	U = yuv[1]
		,	V = yuv[2]
		,	num  = frame.num()
		,	imageData = _image(frame)
		,	data = imageData.data
		,	yH = new Array(256)
		;
		let	tl = 0;
		yH.fill(0);

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const	y = Y[i], u = U[i], v = V[i];
			data[o  ] = y           + 1.402*v;
			data[o+1] = y - 0.344*u - 0.714*v;
			data[o+2] = y + 1.772*u;
			data[o+3] = 255;

			_u8clamp[0] = y;
			yH[_u8clamp[0]] += 1;
			tl += y;
		}

		frame.updateStat('Y', yH, tl);
		return imageData
	}
,	'BW-delta': function (frame) {
		const d = _j.delta.get(frame)
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'Gray-delta': function (frame) {
		const d = _j.delta.get(frame)
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'8colors': function (frame) {
		const num  = frame.num()
		,     imageData = _image(frame)
		,     data = imageData.data
		,     RGB = frame.get('rgb')
		,     R = RGB[0]
		,     G = RGB[1]
		,     B = RGB[2]
		,     tR = _j.image.otsuThreshold(frame.histogram['R'])
		,     tG = _j.image.otsuThreshold(frame.histogram['G'])
		,     tB = _j.image.otsuThreshold(frame.histogram['B'])
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o+0] = R[i] > tR ? 255 : 0;
			data[o+1] = G[i] > tG ? 255 : 0;
			data[o+2] = B[i] > tB ? 255 : 0;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge(Laplacian)': function (frame) {
		const e = frame.get('laplacian')
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'Edge(Laplacian signed)': function (frame) {
		const e = frame.get('laplacian.signed')
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'Edge(Sobel)': function (frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'Edge4(Sobel)': function (frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = _image(frame)
		,     data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = _L4[Math.floor(e[i] / 64)];
			data[o  ] = 
			data[o+1] = 
			data[o+2] = C;
			data[o+3] = 255;
		}

		return imageData
	}
,	'Edge2(Sobel)': function (frame) {
		const e = frame.get('sobel')
		,     num  = frame.num()
		,     imageData = _image(frame)
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
,	'Edge(Bin)': function (frame) {
		const num  = frame.num()
		,     imageData = _image(frame)
		,     data = imageData.data
		,     e = frame.get('sobel.rgb')
		,     t = _j.image.otsuThreshold(frame.histogram['sobel.rgb'])
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

let _buildFunc = null;

render.imageMode = (param)=>{
	if (param === undefined)
		return Object.keys(_buildImageFuncs)

	if (!(param in _buildImageFuncs))
		throw new Error('not supported ' + param)

	_buildFunc = _buildImageFuncs[param];
}

render.imageMode(render.imageMode()[0]);

render.buildImage = (frame)=>(_buildFunc(frame));

const _setter = {
	'afactor': (v)=>(_accum.set('factor', v))
};

render.set = (tag, value)=>{
	const fn = _setter[tag];
	if (!fn)
		throw new Error('not supported ' + tag)
	fn(value);
};

});
