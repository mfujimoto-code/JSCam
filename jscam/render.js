'use strict';

const render = Object.create(null);

render.buildImageFuncs = Object.assign(Object.create(null), {
	'GRAY-frame': function (frame) {
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
,	'GRAY-Histogram equalization': function (frame) {
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
,	'YUV-frame': function (frame) {
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
,	'UV:RG-frame': function (frame) {
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
,	'RGB-frame': function (frame) {
		return frame.get('ImageData');
	}
,	'GRAY-accum': function (frame) {
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
,	'RGB-accum': function (frame) {
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
,	'BW-delta': function (frame) {
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
,	'Gray-delta': function (frame) {
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
,	'8colors': function (frame) {
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
,	'Edge(Laplacian)': function (frame) {
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
,	'Edge(Laplacian signed)': function (frame) {
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
,	'Edge(Sobel)': function (frame) {
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
,	'Edge4(Sobel)': function (frame) {
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
,	'Edge2(Sobel)': function (frame) {
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
,	'Edge(Bin)': function (frame) {
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

render.accum = new Accum();
