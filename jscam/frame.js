'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

_j.Frame = function (image, timestamp) {
	if (!(image instanceof ImageData))
		throw new Error('Frame requires a source ImageData')

	if (timestamp === undefined)
		timestamp = performance.now();

	this.timestamp = ()=>(timestamp);

	this.feed(image);
}

_j.Frame._getters = Object.assign(Object.create(null), {
	'rgba':             function () {return this._getRgba()}
,	'red':              function () {return this._getRed()}
,	'green':            function () {return this._getGreen()}
,	'blue':             function () {return this._getBlue()}
,	'rgb':              function () {return this._getRgb()}
,	'gray':             function () {return this._getGray()}
,	'yuv':              function () {return this._getYUV()}
,	'equalized':        function () {return this._getEqualized()}
,	'laplacian':        function () {return this._getEdge('laplacian')}
,	'laplacian.signed': function () {return this._getEdge('laplacian.signed')}
,	'sobel':            function () {return this._getEdge('sobel')}
,	'sobel.rgb':        function () {return this._getEdge('sobel.rgb')}
});
_j.Frame.prototype = {
	feed: function (imageData) {
		const width  = imageData.width;
		const height = imageData.height;
		const num    = width * height;

		this.size = ()=>([width, height]);
		this.num  = ()=>(num);
		this.histogram = Object.create(null);
		this.luminance = Object.create(null);
		this.getter = Object.create(null);
		this.getter['ImageData'] = ()=>(imageData);
	}
	, updateStat: function (tag, histogram, luminance) {
		if (typeof tag !== 'string'
		||  typeof histogram.length !== 'number'
		||  typeof luminance !== 'number')
			throw new Error('invalid param')

		this.histogram[tag] = histogram;
		this.luminance[tag] = luminance;
	}
	, get: function (id) {
		const fn = this.getter[id];
		if (fn) return fn.call(this);

		const initfn = _j.Frame._getters[id];
		if (!initfn) throw new Error('not supported ' + id)
		return initfn.call(this)
	}
	, _getRgba: function () {
		const data = this.get('ImageData').data;
		this.getter['rgba'] = ()=>(data);
		return this.get('rgba')
	}
	, __getComponent: function (index, cTag, hTag) {
		const num  = this.num()
		,     data = this.get('rgba')
		,     C = new Uint8ClampedArray(num)
		,     hC = new Array(256)
		;

		let tl = 0;

		hC.fill(0);
		for (let i = 0, o = index; i < num; ++i, o += 4) {
			const lum = data[o];
			C[i] = lum;
			hC[lum] += 1;
			tl += lum;
		}

		this.histogram[hTag] = hC;
		this.luminance[hTag] = tl;
		this.getter[cTag] = ()=>(C);

		return this.get(cTag)
	}
	, _getRed: function () {
		return this.__getComponent(0, 'red', 'R')
	}
	, _getGreen: function () {
		return this.__getComponent(1, 'green', 'G')
	}
	, _getBlue: function () {
		return this.__getComponent(2, 'blue', 'B')
	}
	, _getRgb: function () {
		this.getter['rgb'] = ()=>[
			this.get('red')
		,	this.get('green')
		,	this.get('blue')
		];

		return this.get('rgb')
	}
	, _getEqualized: function () {
		const e = _j.image.equalize(
			this.get('gray')
		,       this.histogram['gray']
		);
		this.getter['equalized'] = ()=>(e[0]);
		this.histogram['equalization'] = e[1];
		this.luminance['equalization'] = e[2];
		return this.get('equalized')
	}
	, _getYUV: function () {
		const data = this.get('rgba')
		,     num = this.num()
		,     Y = new Uint8ClampedArray(num)
		,     UV = new Array(num * 2)
		,     histogram = new Array(256)
		;
		let tl = 0;

		histogram.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const r = data[o+0];
			const g = data[o+1];
			const b = data[o+2];

			// Y =  0.299R + 0.587G + 0.114B
			// U = -0.169R - 0.331G + 0.500B
			// V =  0.500R - 0.419G - 0.081B

			const y = r*0.299 + g*0.587 + b*0.114
			,     u =-r*0.169 - g*0.331 + b*0.500
			,     v = r*0.500 - g*0.419 - b*0.081;

			Y[i] = y;
			UV[i*2] = u;
			UV[i*2+1] = v;
			histogram[Y[i]] += 1;
			tl += y;
		}
		this.getter['yuv'] = ()=>({'Y':Y, 'UV':UV});
		this.histogram['Y'] = histogram;
		this.luminance['Y'] = tl;
		return this.get('yuv');
	}
	, _getGray: function () {
		const data = this.get('rgba')
		,     num = this.num()
		,     gray = new Uint8ClampedArray(num)
		,     histogram = new Array(256)
		;
		let tl = 0;
		histogram.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			gray[i] = Math.round(
				data[o+0] * 0.299
			+	data[o+1] * 0.587
			+	data[o+2] * 0.114
			);
			histogram[gray[i]] += 1;
			tl += gray[i];
		}
		this.getter['gray'] = ()=>(gray);
		this.histogram['gray'] = histogram;
		this.luminance['gray'] = tl;
		return this.get('gray');
	}
	, _getEdge: function (method) {
		const e = new Uint8ClampedArray(this.num())
		,     w = this.size()[0]
		,     O = [
			-w-1, -w, -w+1,
			  -1,  0,    1,
			 w-1,  w,  w+1
		      ]
		;

		if (method == 'sobel.rgb') {
			const plane = this.get('rgb')
			,     R = plane[0]
			,     G = plane[1]
			,     B = plane[2]
			,     num = this.num()
			,     eR = new Uint8ClampedArray(num)
			,     eG = new Uint8ClampedArray(num)
			,     eB = new Uint8ClampedArray(num)
			;
			_j.image.sobel(eR, R, O);
			_j.image.sobel(eG, G, O);
			_j.image.sobel(eB, B, O);
			for (let i = 0; i < num; ++i)
				e[i] = Math.max(eR[i], eG[i], eB[i]);
		}
		else if (method == 'laplacian') {
			const raw = new Int16Array(e.length);
			_j.image.laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) e[i] = Math.abs(raw[i]);
		}
		else if (method == 'laplacian.signed') {
			const raw = new Int16Array(e.length);
			_j.image.laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) e[i] = raw[i] + 128;
		}
		else if (method == 'sobel') {
			_j.image.sobel(e, this.get('gray'), O);
		}
		else throw new Error('not supported ' + method)

		this.getter[method] = ()=>(e);

		const histogram = new Array(256);
		let tl = 0;
		histogram.fill(0);
		for (let i = 0; i < e.length; ++i) {
			histogram[e[i]] += 1;
			tl += e[i];
		}
		this.histogram[method] = histogram;
		this.luminance[method] = tl;

		return this.get(method);
	}
}

});
