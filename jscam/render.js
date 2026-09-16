'use strict';

const buildImageFuncs = {
	'GRAY-frame': function (ic, frame) {
		const yuv = frame.getYUV();
		const num  = frame.getNum();
		const size = frame.getSize();
		const imageData = new ImageData(size[0], size[1]);
		const data = imageData.data;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = yuv.Y[i];
			data[o+3] = 255;
		}
		return imageData;
	}
	, 'GRAY-Histogram equalization': function (ic, frame) {
		const e = frame.getEqualized()
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = e[i];
			data[o+3] = 255;
		}
		return imageData;
	}
	, 'G-edge(Laplacian)': function (ic, frame) {
		const e = frame.getEdge('laplacian')
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
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
	, 'G-edge(Laplacian signed)': function (ic, frame) {
		const e = frame.getEdge('laplacian.signed')
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
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
	, 'G-edge(Sobel)': function (ic, frame) {
		const e = frame.getEdge('sobel')
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
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
	, 'C-edge(Sobel)': function (ic, frame) {
		const e = frame.getEdge('sobel')
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const C = render.COLOR8[Math.floor(e[i] / 32)];
			data[o  ] = C[0];
			data[o+1] = C[1];
			data[o+2] = C[2];
			data[o+3] = 255;
		}

		return imageData
	}
	// R = 1.000Y          + 1.402V
	// G = 1.000Y - 0.344U - 0.714V
	// B = 1.000Y + 1.772U
	, 'YUV-frame': function (ic, frame) {
		const yuv = frame.getYUV()
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const Y = yuv.Y[i]
			, U = yuv.UV[i * 2]
			, V = yuv.UV[i * 2 + 1]
			;
			data[o  ] = Y + 1.402*V;
			data[o+1] = Y - 0.344*U - 0.714*V;
			data[o+2] = Y + 1.772*U;
			data[o+3] = 255;
		}
		return imageData;
	}
	, 'UV:RG-frame': function (ic, frame) {
		const yuv = frame.getYUV()
		, num  = frame.getNum() * 2
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
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
		return frame.getImage();
	}
	, 'GRAY-accum': function (ic, frame) {
		delta.accum(frame);
		const gray = delta.aBuffer
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = gray[i];
			data[o+3] = 255;
		}

		return imageData
	}
	, 'BW-delta': function (ic, frame) {
		const d = delta.get(frame)
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data;

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
		, num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data;

		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o  ] =
			data[o+1] =
			data[o+2] = Math.abs(d[i]);
			data[o+3] = 255;
		}

		return imageData
	}
	, '8colors': function (ic, frame) {
		const num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
		, RGB = frame.get3Planars()
		, R = RGB[0]
		, G = RGB[1]
		, B = RGB[2]
		, tR = Frame.calcThreshold(frame.histogram['R'])
		, tG = Frame.calcThreshold(frame.histogram['G'])
		, tB = Frame.calcThreshold(frame.histogram['B'])
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o+0] = R[i] > tR ? 255 : 0;
			data[o+1] = G[i] > tG ? 255 : 0;
			data[o+2] = B[i] > tB ? 255 : 0;
			data[o+3] = 255;
		}

		return imageData
	}
	, 'Bin-edge': function (ic, frame) {
		const num  = frame.getNum()
		, size = frame.getSize()
		, imageData = new ImageData(size[0], size[1])
		, data = imageData.data
		, e = frame.getEdge('sobel.rgb')
		, t = Frame.calcThreshold(frame.histogram['sobel.rgb'])
		;
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			data[o+0] =
			data[o+1] =
			data[o+2] = e[i] > t ? 255 : 0;
			data[o+3] = 255;
		}

		return imageData
	}
};

const render = {
	buildImage: buildImageFuncs['RGB-frame']
	, COLOR8:[
		[0, 0, 0]
		, [255, 0, 0]
		, [0, 255, 0]
		, [255, 255, 0]
		, [0, 0, 255]
		, [255, 0, 255]
		, [0, 255, 255]
		, [255, 255, 255]
	]
	, histogram: function (frame, histogram) {
		const hc = render.hc
		, gc = hc.getContext('2d')
		, num = frame.getNum()
		, max = histogram.reduce((a,b)=>(Math.max(a,b)), 0)
		, barScale = (hc.height / 3) / max
		, lineScale = (hc.height / 3) / num
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
		, imageData = render.buildImage(ic, frame)
		;
		ic.getContext('2d').putImageData(imageData, 0, 0);
	}
	, getImage: function (src) {
		const ic = render.ic;
		const ictx = ic.getContext('2d');
		ictx.drawImage(src, 0, 0, ic.width, ic.height);
		return ictx.getImageData(0, 0, ic.width, ic.height);
	}
	, show: function () {
		const dc = render.dc;
		const dctx = dc.getContext('2d');
		dctx.drawImage(render.ic, 0, 0, dc.width, dc.height);
	}
	, resize: function (disp, internal) {
		if (disp instanceof Array) {
			if (render.dc.width != disp[0] || render.dc.height != disp[1]) {
				print ('size = ' + disp[0] + 'x' + disp[1]);
				render.dc.width  = disp[0];
				render.dc.height = disp[1];
			}
		}
		if (internal instanceof Array) {
			if (render.ic.width != internal[0] || render.ic.height != internal[1]) {
				render.ic.width  = internal[0];
				render.ic.height = internal[1];
			}
			if (render.hc.width != internal[0] || render.hc.height != internal[1]) {
				render.hc.width  = internal[0];
				render.hc.height = internal[1];
			}
		}
	}
}
render.ic = e('i-canvas'); // for internal use
render.dc = e('d-canvas'); // for display
render.hc = e('h-canvas'); // histogram overlay (ic bitmap, contain-scaled)
