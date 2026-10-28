'use strict';

jsCam.initFn.push((kparam)=>{

const	_j = jsCam
,	_image = _j.hash()
;

_j.image = _image;

const _y2rgba = (from, to)=>{
	const	L = from
	,	fromLen = L.length
	;

	for (let fi = 0, ti = 0; fi < fromLen; ++fi, ti+=4) {
		to[ti  ] =
		to[ti+1] =
		to[ti+2] = L[fi];
		to[ti+3] = 255;
	}
};

const _rgb2rgba = (from, to)=>{
	const	R = from[0]
	,	G = from[1]
	,	B = from[2]
	,	fromLen = R.length
	;

	for (let fi = 0, ti = 0; fi < fromLen; ++fi, ti+=4) {
		to[ti  ] = R[fi];
		to[ti+1] = G[fi];
		to[ti+2] = B[fi];
		to[ti+3] = 255;
	}
};

const _yuv2rgba = (from, to)=>{
	const	Y = from[0]
	,	U = from[1]
	,	V = from[2]
	,	fromLen = Y.length
	;

	// R = 1.000Y          + 1.402V
	// G = 1.000Y - 0.344U - 0.714V
	// B = 1.000Y + 1.772U
	for (let fi = 0, ti = 0; fi < fromLen; ++fi, ti+=4) {
		const y = Y[fi], u = U[fi], v = V[fi];
		to[ti  ] = y           + 1.402*v;
		to[ti+1] = y - 0.344*u - 0.714*v;
		to[ti+2] = y + 1.772*u;
		to[ti+3] = 255;
	}
};

const _rgba2y = (from, to)=>{
	const	toLen = to.length;
	for (let fi = 0, ti = 0; ti < toLen; fi+=4, ++ti) {
		to[ti] = from[fi+0]*0.299
		+	 from[fi+1]*0.587
		+	 from[fi+2]*0.114
		;
	}
};

const __rgba2x = (from, to, x)=>{
	const	toLen = to.length;
	for (let fi = x, ti = 0; ti < toLen; fi+=4, ++ti) {
		to[ti] = from[fi];
	}
};
const _rgba2r = (from, to)=>(__rgba2x(from, to, 0));
const _rgba2g = (from, to)=>(__rgba2x(from, to, 1));
const _rgba2b = (from, to)=>(__rgba2x(from, to, 2));

const _rgba2rgb = (from, to)=>{
	const	toLen = to[0].length
	,	R = to[0]
	,	G = to[1]
	,	B = to[2]
	;
	for (let fi = 0, ti = 0; ti < toLen; fi+=4, ++ti) {
		R[ti] = from[fi+0];
		G[ti] = from[fi+1];
		B[ti] = from[fi+2];
	}
};

const _rgba2yuv = (from, to)=>{
	const	toLen = to[0].length
	,	Y = to[0]
	,	U = to[1]
	,	V = to[2]
	;
	for (let fi = 0, ti = 0; ti < toLen; fi+=4, ++ti) {
		const	r = from[fi+0]
		,	g = from[fi+1]
		,	b = from[fi+2]
		;
		// Y =  0.299R + 0.587G + 0.114B
		// U = -0.169R - 0.331G + 0.500B
		// V =  0.500R - 0.419G - 0.081B
		Y[ti] = r*0.299 + g*0.587 + b*0.114;
		U[ti] =-r*0.169 - g*0.331 + b*0.500;
		V[ti] = r*0.500 - g*0.419 - b*0.081;
	}
};

const _convHash = {
	'rgba': {
		'yuv':       _yuv2rgba
	,	'rgb':       _rgb2rgba
	,	'y':         _y2rgba
	,	'luminance': _y2rgba
	,	'gray':      _y2rgba
	}
,	'yuv': {
		'rgba': _rgba2yuv
	}
,	'rgb': {
		'rgba':	_rgba2rgb
	}
,	'r': {
		'rgba':	_rgba2r
	}
,	'g': {
		'rgba':	_rgba2g
	}
,	'b': {
		'rgba':	_rgba2b
	}
,	'y': {
		'rgba':	_rgba2y
	}
,	'luminance': {
		'rgba':	_rgba2y
	}
,	'gray': {
		'rgba':	_rgba2y
	}
};

_image.convert = (dst, src)=>{
	const	df = dst[0]
	,	dd = dst[1]
	,	sf = src[0]
	,	sd = src[1]
	;

	const dHash = _convHash[df];
	if (!dHash)
		_j.fatal(new Error(`not supported ${sf} to ${df}`));
	const fn = dHash[sf];
	if (!fn)
		_j.fatal(new Error(`not supported ${sf} to ${df}`));

	fn(sd, dd);
};

const _u8clamp = new Uint8ClampedArray(1);

_image.stat = (histogram, luminance, src, shape)=>{
	if (!shape) {
		for (let i = 0; i < src.length; ++i) {
			const	cell = src[i]
			,	h = histogram[i]
			;
			h.fill(0);
			let	tl = 0;
			for (let j = 0; j < cell.length; ++j) {
				tl += cell[j];	
				_u8clamp[0] = cell[j];
				h[_u8clamp[0]] += 1;
			}
			luminance[i] = tl;
		}
		return
	}

	const	inner = shape[2]
	,	stride = shape[0]
	,	start = stride * inner + inner
	,	endOffset = stride * inner + inner
	,	width = stride - inner * 2
	;

	for (let i = 0; i < src.length; ++i) {
		const	cell = src[i]
		,	h = histogram[i]
		;
		h.fill(0);
		let	tl = 0;
		const	end = cell.length - endOffset;
		for (let j = start; j < end; j += stride) {
			for (let k = 0; k < width; ++k) {
				const	c = cell[j+k];
				tl += c;
				_u8clamp[0] = c;
				h[_u8clamp[0]] += 1;
			}
		}
		luminance[i] = tl;
	}
};

const	_otsu = (oW, oS, histogram)=>{
	let H = 0;
	for (let k = 0; k < histogram.length; ++k) H += histogram[k];

	oW[0] = histogram[0];
	oS[0] = 0;
	for (let k = 1; k < histogram.length; ++k) {
		oW[k] = oW[k-1] + histogram[k];
		oS[k] = oS[k-1] + k*histogram[k];
	}

	const S = oS[oS.length - 1]
	;
	let maxK = 0
	,   max = 0
	;
	for (let k = 1; k < histogram.length; ++k) {
		const w1 = oW[k]
		,     w2 = H - oW[k]
		;
		if (w1 == 0 || w2 == 0) continue
		const s1 = oS[k]
		,     s2 = S - oS[k]
		,     m1 = s1 / w1
		,     m2 = s2 / w2
		,     r = w1*w2*(m1-m2)*(m1-m2)
		;
		if (max > r) continue
		maxK = k;
		max = r;
	}
	return maxK
};

const	_otsuWant = [[Uint32Array, 256], [Uint32Array, 256]];
_image.otsuThreshold = (histogram)=>(
	_j.use(_otsuWant, (w, s)=>(_otsu(w, s, histogram)))
);

const _kernel3x3 = {
	'sobelX': new Float32Array([ // Sobel horizontal kernel
		-1, 0, 1
	,	-2, 0, 2
	,	-1, 0, 1
	])
,	'sobelY': new Float32Array([ // Sobel vertical kernel
		-1, -2, -1
	,	 0,  0,  0
	,	 1,  2,  1
	])
,	'laplacian': new Float32Array([ // Laplacian kernel
		 1,  1, 1
	,	 1, -8, 1
	,	 1,  1, 1
	])
};

const	_offset3x3 = (stride)=>{
	if (stride === _offset3x3.stride)
		return _offset3x3.table

	_offset3x3.table = new Int32Array([
		-stride-1, -stride, -stride+1,
		       -1,       0,         1,
		 stride-1,  stride,  stride+1
	]);
	_offset3x3.stride = stride;

	return _offset3x3.table
};
_offset3x3.stride = -1;
_offset3x3.table = null;

_image.sobel = (dst, src, stride)=>{ // 3x3
	const	Ky = _kernel3x3['sobelY']
	,	Kx = _kernel3x3['sobelX']
	,	O = _offset3x3(stride)
	,	start = O[8]
	,	end = src.length + O[0]
	;
	dst.fill(0);
	for (let i = start; i < end; ++i) {
		let Iy = 0, Ix = 0;
		for (let k = 0; k < 9; ++k) {
			const S = src[i + O[k]];
			Iy += Ky[k] * S;
			Ix += Kx[k] * S;
		}
		dst[i] = Math.sqrt(Ix * Ix + Iy * Iy);
	}
};

_image.laplacian = (dst, src, stride)=>{ // 3x3 8direction
	const	K = _kernel3x3['laplacian']
	,	O = _offset3x3(stride)
	,	start = O[8]
	,	end = src.length + O[0]
	;

	dst.fill(0);
	for (let i = start; i < end; ++i) {
		let I = 0;
		for (let k = 0; k < 9; ++k) {
			I += K[k] * src[i + O[k]];
		}
		dst[i] = I;
	}
};

const	_mapLUT = (to, from, lut)=>{
	for (let i = 0; i < to.length; ++i) 
		to[i] = lut[from[i]>>>0];
}

const _equalizeLUT = (lut, histogram, bufSize)=>{
	_j.use([[Uint32Array, 256]], (_eqSum)=>{
		const	Nl = bufSize;

		for (let i = 0, sum = 0; i < 256; ++i) {
			sum += histogram[i];
			_eqSum[i] = sum;
		}

		let	Hmin = -1;
		for (let i = 0; i < 256; ++i) {
			if (_eqSum[i] != 0) {
				Hmin = _eqSum[i];
				break
			}
		}

		// clone if all elements are identical
		if (Nl === Hmin) {
			lut.forEach((e, i)=>(lut[i] = i));
			return
		}

		const	factor = 255 / (Nl - Hmin);
		for (let i = 0; i < 256; ++i) 
			lut[i] = (_eqSum[i] - Hmin) * factor
	});
};

_image.equalize = (out, lbuf, histogram)=>{
	_j.use([[Uint8ClampedArray, 256]], (_eqLUT)=>{
		_equalizeLUT(_eqLUT, histogram, out.length);
		_mapLUT(out, lbuf, _eqLUT);
	});
};
_image.equalize.lut = _equalizeLUT;
_image.equalize.map = _mapLUT;


});
