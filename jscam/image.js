'use strict';

jsCam.initFn.push((kparam)=>{

const	_j = jsCam
,	_image = Object.create(null)
;

_j.image = _image;

const _lum2rgba = (from, to)=>{
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

const _convHash = {
	'rgba': {
		'yuv':       _yuv2rgba
	,	'rgb':       _rgb2rgba
	,	'luminance': _lum2rgba
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
		throw new Error(`not supported ${sf} to ${df}`)
	const fn = dHash[sf];
	if (!fn)
		throw new Error(`not supported ${sf} to ${df}`)

	fn(sd, dd);
};

_image.otsuThreshold = (histogram)=>{
	let H = 0
	;
	const w = new Array(histogram.length)
	,     s = new Array(histogram.length)
	;
	for (let k = 0; k < histogram.length; ++k) H += histogram[k];
	w[0] = histogram[0];
	s[0] = 0;
	for (let k = 1; k < histogram.length; ++k) {
		w[k] = w[k-1] + histogram[k];
		s[k] = s[k-1] + k*histogram[k];
	}

	const S = s[s.length - 1]
	;
	let maxK = 0
	,   max = 0
	;
	for (let k = 1; k < histogram.length; ++k) {
		const w1 = w[k]
		,     w2 = H - w[k]
		;
		if (w1 == 0 || w2 == 0) continue
		const s1 = s[k]
		,     s2 = S - s[k]
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

_image.sobel = (dst, src, O)=>{ // 3x3
	const Ky = [ // Sobel vertical kernel
		 -1, -2, -1
		, 0,  0,  0
		, 1,  2,  1]
	,     Kx = [ // Sobel horizontal kernel
		  -1, 0, 1
		, -2, 0, 2
		, -1, 0, 1]
	,     start = O[8]
	,     end = src.length + O[0]
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

_image.laplacian = (dst, src, O)=>{ // 3x3 8direction
	const K = [ // Laplacian kernel
		  1,  1, 1
		, 1, -8, 1
		, 1,  1, 1]
	,     start = O[8]
	,     end = src.length + O[0]
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

_image.equalize = (luminance, histogram)=>{
	const	Nl = luminance.length
	,	Nh = histogram.length
	,	eq = new Uint8ClampedArray(Nl)
	;

	_j.monitor(eq);

	const	H = [];
	for (let i = 0, sum = 0; i < Nh; ++i) {
		sum += histogram[i];
		H.push(sum);
	}
	let Hmin = -1;
	for (let i = 0; i < H.length; ++i) {
		if (H[i] != 0) {
			Hmin = H[i];
			break
		}
	}

	// clone if all elements are identical
	if (Nl === Hmin) {
		const t = histogram.reduce((a, c, i)=>(a + c * i), 0);
		luminance.forEach((ele, i)=>(eq[i] = ele));
		return [eq, [...histogram], t]
	}

	const	factor = (Nh - 1) / (Nl - Hmin)
	,	LUT = H.map((Hi)=>(Math.round((Hi - Hmin) * factor)))
	,	eHistogram = new Array(Nh);
	;
	let	tl = 0;
	eHistogram.fill(0);
	for (let i = 0; i < Nl; ++i) {
		const l = LUT[luminance[i]];
		eq[i] = l;
		eHistogram[l] += 1;
		tl += l;
	}

	return [eq, eHistogram, tl]
};

});
