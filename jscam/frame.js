'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const Frame = function (image, timestamp) {
	if (!(image instanceof ImageData))
		throw new Error('Frame requires a source ImageData')

	if (timestamp === undefined)
		timestamp = performance.now();

	this.timestamp = ()=>(timestamp);

	this.feed(image);
}

_j.Frame = Frame;

Frame._getters = Object.assign(Object.create(null), {
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

Frame._setters = Object.assign(Object.create(null), {
	'buffer':	function (value) {
		this.getter[value[0]] = ()=>(value[1])
	}
,	'histogram':	function (value) {
		this._histogram[value[0]] = ()=>(value[1])
	}
,	'luminance':	function (value) {
		this._luminance[value[0]] = ()=>(value[1])
	}
});

Frame.prototype = {
	feed: function (imageData) {
		const width  = imageData.width;
		const height = imageData.height;
		const num    = width * height;

		this.size = ()=>([width, height]);
		this.num  = ()=>(num);
		this._histogram = Object.create(null);
		this._luminance = Object.create(null);
		this.getter = Object.create(null);
		this.getter['ImageData'] = ()=>(imageData);
	}
	, set: function (tag, value) {
		const fn = Frame._setters[tag];
		if (!fn) throw new Error(`not supported ${tag}`)

		fn.call(this, value)
	}
	, get: function (tag) {
		const fn = this.getter[tag];
		if (fn) return fn.call(this);

		const initfn = Frame._getters[tag];
		if (!initfn) throw new Error(`not supported ${tag}`)
		return initfn.call(this)
	}
	, histogram: function (tag) {
		if (!tag) 
			return Object.keys(this._histogram)
		return this._histogram[tag]()
	}
	, luminance: function (tag) {
		if (!tag) 
			return Object.keys(this._luminance)
		return this._luminance[tag]()
	}
	, _getRgba: function () {
		const data = this.get('ImageData').data;
		this.set('buffer', ['rgba', data]);
		return this.get('rgba')
	}
	, __getComponent: function (index, cTag) {
		const num  = this.num()
		,     data = this.get('rgba')
		,     C = _j.newObj(Uint8ClampedArray, num)
		,     hC = _j.newObj(Array, 256)
		;

		let tl = 0;

		hC.fill(0);
		for (let i = 0, o = index; i < num; ++i, o += 4) {
			const lum = data[o];
			C[i] = lum;
			hC[lum] += 1;
			tl += lum;
		}

		this.set('buffer',    [cTag, C]);
		this.set('histogram', [cTag, hC]);
		this.set('luminance', [cTag, tl]);

		return this.get(cTag)
	}
	, _getRed: function () {
		return this.__getComponent(0, 'red')
	}
	, _getGreen: function () {
		return this.__getComponent(1, 'green')
	}
	, _getBlue: function () {
		return this.__getComponent(2, 'blue')
	}
	, _getRgb: function () {
		this.set('buffer', 
		[	'rgb'
		,	[
				this.get('red')
			,	this.get('green')
			,	this.get('blue')
			]
		]);

		return this.get('rgb')
	}
	, _getEqualized: function () {
		const e = _j.image.equalize(
			this.get('gray')
		,       this.histogram('gray')
		);
		this.set('buffer',    ['equalized', e[0]]);
		this.set('histogram', ['equalized', e[1]]);
		this.set('luminance', ['equalized', e[2]]);
		return this.get('equalized')
	}
	, _getYUV: function () {
		const	data = this.get('rgba')
		,	num = this.num()
		,	Y = _j.newObj(Uint8ClampedArray, num)
		,	U = _j.newObj(Array, num)
		,	V = _j.newObj(Array, num)
		,	hY = _j.newObj(Array, 256)
		;
		let tl = 0;

		hY.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			const r = data[o+0];
			const g = data[o+1];
			const b = data[o+2];

			// Y =  0.299R + 0.587G + 0.114B
			// U = -0.169R - 0.331G + 0.500B
			// V =  0.500R - 0.419G - 0.081B

			Y[i] = r*0.299 + g*0.587 + b*0.114
			U[i] =-r*0.169 - g*0.331 + b*0.500
			V[i] = r*0.500 - g*0.419 - b*0.081;

			hY[Y[i]] += 1;
			tl += Y[i];
		}
		this.set('buffer',    ['yuv', [Y, U, V]]);
		this.set('histogram', ['y',   hY]);
		this.set('luminance', ['y',   tl]);
		return this.get('yuv');
	}
	, _getGray: function () {
		const data = this.get('rgba')
		,     num = this.num()
		,     gray = _j.newObj(Uint8ClampedArray, num)
		,     hG = _j.newObj(Array, 256)
		;

		let tl = 0;
		hG.fill(0);
		for (let i = 0, o = 0; i < num; ++i, o += 4) {
			gray[i] = Math.round(
				data[o+0] * 0.299
			+	data[o+1] * 0.587
			+	data[o+2] * 0.114
			);
			hG[gray[i]] += 1;
			tl += gray[i];
		}
		this.set('buffer',    ['gray', gray]);
		this.set('histogram', ['gray', hG]);
		this.set('luminance', ['gray', tl]);
		return this.get('gray');
	}
	, _getEdge: function (method) {
		const e = _j.newObj(Uint8ClampedArray, this.num())
		,     w = this.size()[0]
		,     O = [
			-w-1, -w, -w+1,
			  -1,  0,    1,
			 w-1,  w,  w+1
		      ]
		;

		const hE = _j.newObj(Array, 256);
		let tl = 0;
		hE.fill(0);

		if (method == 'sobel.rgb') {
			const plane = this.get('rgb')
			,     R = plane[0]
			,     G = plane[1]
			,     B = plane[2]
			,     num = this.num()
			,     eR = _j.newObj(Uint8ClampedArray, num)
			,     eG = _j.newObj(Uint8ClampedArray, num)
			,     eB = _j.newObj(Uint8ClampedArray, num)
			;
			_j.image.sobel(eR, R, O);
			_j.image.sobel(eG, G, O);
			_j.image.sobel(eB, B, O);
			for (let i = 0; i < num; ++i) {
				e[i] = Math.max(eR[i], eG[i], eB[i]);
				hE[e[i]] += 1;
				tl += e[i];
			}
		}
		else if (method == 'laplacian') {
			const raw = _j.newObj(Int16Array, e.length);
			_j.image.laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) {
				e[i] = Math.abs(raw[i]);
				hE[e[i]] += 1;
				tl += e[i];
			}
		}
		else if (method == 'laplacian.signed') {
			const raw = _j.newObj(Int16Array, e.length);
			_j.image.laplacian(raw, this.get('gray'), O);
			for (let i = 0; i < e.length; ++i) {
				e[i] = raw[i] + 128;
				hE[e[i]] += 1;
				tl += e[i];
			}
		}
		else if (method == 'sobel') {
			_j.image.sobel(e, this.get('gray'), O);
		}
		else throw new Error('not supported ' + method)

		this.set('buffer',    [method, e]);
		this.set('histogram', [method, hE]);
		this.set('luminance', [method, tl]);
		return this.get(method);
	}
}

});
