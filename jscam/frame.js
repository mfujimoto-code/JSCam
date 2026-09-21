'use strict';

const Frame = function (image) {
	if (!(image instanceof ImageData))
		throw new Error('Frame require a source ImageData');

	this.feed(image);

	const id = ++Frame.serial;
	this.id = function () {return id}
	Frame.array.push(id);
	Frame.map[id] = this;

	if (Frame.array.length > Frame.HIGH) {
		while (Frame.array.length > Frame.LOW) {
			const oldest = Frame.array.shift();
			delete Frame.map[oldest];
		}
	}
}
Frame.HIGH = 20;
Frame.LOW = 10;
Frame.array = [];
Frame.map = {};
Frame.serial = 0;
Frame._Laplacian = (dst, src, O)=>{ // 3x3 8direction
	const K = [ // Laplacian kernel
		1, 1, 1
		, 1, -8, 1
		, 1, 1, 1
	]
	, start = O[8]
	, end = src.length + O[0]
	;

	dst.fill(0);
	for (let i = start; i < end; ++i) {
		let I = 0;
		for (let k = 0; k < 9; ++k) {
			I += K[k] * src[i + O[k]];
		}
		dst[i] = I;
	}
}
Frame._Sobel = (dst, src, O)=>{ // 3x3
	const Ky = [ // Sobel vertical kernel
		-1, -2, -1
		, 0, 0, 0
		, 1, 2, 1
	]
	, Kx = [ // Sobel horizontal kernel
		-1, 0, 1
		, -2, 0, 2
		, -1, 0, 1
	]
	, start = O[8]
	, end = src.length + O[0]
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
}
Frame.calcThreshold = (histogram)=>{
	let H = 0
	;
	const w = new Array(histogram.length)
	, s = new Array(histogram.length)
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
	, max = 0
	;
	for (let k = 1; k < histogram.length; ++k) {
		const w1 = w[k]
		, w2 = H - w[k]
		;
		if (w1 == 0 || w2 == 0) continue
		const s1 = s[k]
		, s2 = S - s[k]
		, m1 = s1 / w1
		, m2 = s2 / w2
		, r = w1*w2*(m1-m2)*(m1-m2)
		;
		if (max > r) continue
		maxK = k;
		max = r;
	}
	return maxK
}
Frame._getters = const obj = Object.assign(Object.create(null), {
	'ImageData':          function() {}	// initialized at feed
	, 'rgba':             function() {return this._getRgba()}
	, 'gray':             function() {return this._getGray()}
	, 'rgb':              function() {return this._getRgb()}
	, 'yuv':              function() {return this._getYUV()}
	, 'equalized':        function() {return this._getEqualized()}
	, 'laplacian':        function() {return this._getEdge('laplacian')}
	, 'laplacian.signed': function() {return this._getEdge('haplacian.signed')}
	, 'sobel':            function() {return this._getEdge('sobel')}
	, 'sobel.rgb':        function() {return this._getEdge('sobel.rgb')}
});
Frame.prototype = {
	feed: function (imageData) {
		const width  = imageData.width;
		const height = imageData.height;
		const num    = width * height;

		this.size = ()=>([width, height]);
		this.num  = ()=>(num);
		this.histogram = Object.create(null);
		this.getter = Object.create(null);
		this.getter['ImageData'] = ()=>(imageData);
	}
	, get: function (id) {
		const fn = this.getter[id];
		if (fn) return fn.call(this);

		const initfn = Frame._getters[id];
		if (!initfn) throw 'not supported ' + id;
		return initfn.call(this)
	}
	, _getRgba: function () {
		this.getter['rgba'] = ()=>(this.get('ImangeData').data);
		return this.get('rgba')
	}
	, _getRgb: function () {
		const num  = this.num()
		, data = this.get('rgba')
		, R = new Uint8ClampedArray(num)
		, G = new Uint8ClampedArray(num)
		, B = new Uint8ClampedArray(num)
		, hR = new Array(256)
		, hG = new Array(256)
		, hB = new Array(256)
		;

		hR.fill(0);
		hG.fill(0);
		hB.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			R[i] = data[o+0]; hR[R[i]] += 1;
			G[i] = data[o+1]; hG[G[i]] += 1;
			B[i] = data[o+2]; hB[B[i]] += 1;
		}

		this.histogram['R'] = hR;
		this.histogram['G'] = hG;
		this.histogram['B'] = hB;
		this.getter['rgb'] = ()=>[R,G,B];

		return this.get('rgb')
	}
	, _getEqualized: function () {
		const g = this.get('gray')
		, num  = this.num()
		, inv = 1 / num
		, gh = this.histogram['gray']
		;
		const accum = new Array(gh.length);
		accum[0] = gh[0];
		for (let i = 1; i < accum.length; ++i)
			accum[i] = gh[i] + accum[i-1];

		const V = accum.map((v)=>(v*inv))
		, Vmin = V.reduce((a,b)=>(Math.min(a,b)), Infinity)
		, factor = ((1 - Vmin) == 0) ? 0 : (255 / (1 - Vmin))
		, histogram = new Array(256)
		, E = new Uint8ClampedArray(num)
		;
		histogram.fill(0);
		for (let i = 0; i < num; ++i) {
			E[i] = (V[g[i]] - Vmin) * factor;
			histogram[E[i]] += 1;
		}
		this.histogram['equalization'] = histogram;
		this.getter['equalized'] = ()=>(E);
		return this.get('equalized')
	}
	, _getYUV: function () {
		const data = this.get('rgba')
		, num = this.num()
		, Y = new Uint8ClampedArray(num)
		, UV = new Array(num * 2)
		, histogram = new Array(256)
		;

		histogram.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const r = data[o+0];
			const g = data[o+1];
			const b = data[o+2];

			// Y =  0.299R + 0.587G + 0.114B
			// U = -0.169R - 0.331G + 0.500B
			// V =  0.500R - 0.419G - 0.081B

			const y = r*0.299 + g*0.587 + b*0.114
			, u =-r*0.169 - g*0.331 + b*0.500
			, v = r*0.500 - g*0.419 - b*0.081;

			Y[i] = y;
			UV[i*2] = u;
			UV[i*2+1] = v;
			histogram[Y[i]] += 1;
		}
		this.getter['yuv'] = ()=>({'Y':Y, 'UV':UV});
		this.histogram['gray'] = histogram;
		return this.get('yuv');
	}
	, _getGray: function () {
		const data = this.get('rgba');
		const num = this.num();
		const gray = new Uint8ClampedArray(num);
		const histogram = new Array(256);
		histogram.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			gray[i] = Math.round(
				data[o+0] * 0.299
				+ data[o+1] * 0.587
				+ data[o+2] * 0.114
			);
			histogram[gray[i]] += 1;
		}
		this.getter['gray'] = ()=>(gray);
		this.histogram['gray'] = histogram;
		return this.get('gray');
	}
	, _getEdge: function (method) {
		const e = new Uint8ClampedArray(this.num())
		, w = this.size()[0]
		, O = [
			-w-1, -w, -w+1,
			-1, 0, 1,
			w-1, w, w+1
		]
		;

		if (method == 'sobel.rgb') {
			const plane = this.get('rgb')
			, R = plane[0]
			, G = plane[1]
			, B = plane[2]
			, num = this.num()
			, eR = new Uint8ClampedArray(num)
			, eG = new Uint8ClampedArray(num)
			, eB = new Uint8ClampedArray(num)
			;
			Frame._Sobel(eR, R, O);
			Frame._Sobel(eG, G, O);
			Frame._Sobel(eB, B, O);
			for (let i = 0; i < num; ++i)
				e[i] = Math.max(eR[i], eG[i], eB[i]);
		}
		else if (method == 'laplacian') {
			const raw = new Int16Array(e.length);
			Frame._Laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) e[i] = Math.abs(raw[i]);
		}
		else if (method == 'laplacian.signed') {
			const raw = new Int16Array(e.length);
			Frame._Laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) e[i] = raw[i] + 128;
		}
		else if (method == 'sobel') {
			Frame._Sobel(e, this.get('gray'), O);
		}
		else throw 'not supported ' + method

		this.getter[method] = ()=>(e);

		const histogram = new Array(256);
		histogram.fill(0);
		for (let i = 0; i < e.length; ++i)
			histogram[e[i]] += 1;
		this.histogram[method] = histogram;

		return this.get(method);
	}
}
