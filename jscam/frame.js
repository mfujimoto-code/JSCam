'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const Frame = function (image, timestamp) {
	if (!(image instanceof ImageData))
		_j.fatal(new Error('Frame requires a source ImageData'));

	if (timestamp === undefined)
		timestamp = _j.now();

	this.timestamp = ()=>(timestamp);

	this.feed(image);
}

_j.Frame = Frame;

Frame._getters = _j.hash({
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

Frame._setters = _j.hash({
	'buffer':	function (value) {
		this.getter[value[0]] = ()=>(value[1])
	}
,	'histogram':	function (value) {
		if (value[1] === null) {
			delete this._histogram[value[0]]
			return
		}
		this._histogram[value[0]] = ()=>(value[1])
	}
,	'luminance':	function (value) {
		if (value[1] === null) {
			delete this._luminance[value[0]]
			return
		}
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
		this._histogram = _j.hash();
		this._luminance = _j.hash();
		this.getter = _j.hash();
		this.getter['ImageData'] = ()=>(imageData);
	}
	, set: function (tag, value) {
		const fn = Frame._setters[tag];
		if (!fn) _j.fatal(new Error(`not supported ${tag}`));

		fn.call(this, value)
	}
	, get: function (tag) {
		const fn = this.getter[tag];
		if (fn) return fn.call(this);

		const initfn = Frame._getters[tag];
		if (!initfn) _j.fatal(new Error(`not supported ${tag}`));
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
	, __getComponent: function (index) {
		const	num  = this.num()
		,	C = _j.newObj(Uint8ClampedArray, num)
		,	hC = _j.newObj(Uint32Array, 256)
		,	lum = [[0]]
		,	bTag = ['red', 'green', 'blue'][index]
		,	cTag = ['r', 'g', 'b'][index]
		;
		_j.image.convert([cTag, C], ['rgba', this.get('rgba')]);
		_j.image.stat([hC], lum, [C]);
		this.set('buffer',    [bTag, C     ]);
		this.set('histogram', [bTag, hC    ]);
		this.set('luminance', [bTag, lum[0]]);
		return this.get(bTag)
	}
	, _getRed: function () {
		return this.__getComponent(0)
	}
	, _getGreen: function () {
		return this.__getComponent(1)
	}
	, _getBlue: function () {
		return this.__getComponent(2)
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
		const	eq = _j.newObj(Uint8ClampedArray, this.num())
		,	hE = _j.newObj(Uint32Array, 256)
		,	lE = [[0]]
		;
		_j.image.equalize(
			eq
		,	this.get('gray')
		,	this.histogram('gray')
		);
		_j.image.stat([hE], lE, [eq]);
		this.set('buffer',    ['equalized', eq   ]);
		this.set('histogram', ['equalized', hE   ]);
		this.set('luminance', ['equalized', lE[0]]);

		return this.get('equalized')
	}
	, _getYUV: function () {
		const	num = this.num()
		,	yuv = [
				_j.newObj(Uint8ClampedArray, num)
			,	_j.newObj(Float32Array, num)
			,	_j.newObj(Float32Array, num)
			]
		,	hY = _j.newObj(Uint32Array, 256)
		,	lum = [[0]]
		;
		_j.image.convert(['yuv', yuv], ['rgba', this.get('rgba')]);
		_j.image.stat([hY], lum, [yuv[0]]);

		this.set('buffer',    ['yuv', yuv   ]);
		this.set('histogram', ['y',   hY    ]);
		this.set('luminance', ['y',   lum[0]]);
		return this.get('yuv');
	}
	, _getGray: function () {
		const	num = this.num()
		,	gray = _j.newObj(Uint8ClampedArray, num)
		,	hG = _j.newObj(Uint32Array, 256)
		,	lum = [[0]]
		;
		_j.image.convert(['gray', gray], ['rgba', this.get('rgba')]);
		_j.image.stat([hG], lum, [gray]);
		this.set('buffer',    ['gray', gray  ]);
		this.set('histogram', ['gray', hG    ]);
		this.set('luminance', ['gray', lum[0]]);
		return this.get('gray');
	}
	, _getEdge: function (method) {
		const e = _j.newObj(Uint8ClampedArray, this.num())
		,     w = this.size()[0]
		;

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
			_j.image.sobel(eR, R, w);
			_j.image.sobel(eG, G, w);
			_j.image.sobel(eB, B, w);
			for (let i = 0; i < num; ++i)
				e[i] = Math.max(eR[i], eG[i], eB[i]);
		}
		else if (method == 'laplacian') {
			const raw = _j.newObj(Int16Array, e.length);
			_j.image.laplacian(raw, this.get('gray'), w);
			for (let i = 0; i < e.length; ++i) 
				e[i] = Math.abs(raw[i]);
		}
		else if (method == 'laplacian.signed') {
			const raw = _j.newObj(Int16Array, e.length);
			_j.image.laplacian(raw, this.get('gray'), w);
			for (let i = 0; i < e.length; ++i) 
				e[i] = raw[i] + 128;
		}
		else if (method == 'sobel') {
			_j.image.sobel(e, this.get('gray'), w);
		}
		else _j.fatal(new Error('not supported ' + method));

		const	hE = _j.newObj(Uint32Array, 256)
		,	lum = [[0]]
		;
		_j.image.stat([hE], lum, [e]);

		this.set('buffer',    [method, e     ]);
		this.set('histogram', [method, hE    ]);
		this.set('luminance', [method, lum[0]]);
		return this.get(method);
	}
}

});
