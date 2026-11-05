'use strict';

jsCam.initFn.push((kparam)=>{

const	_j = jsCam
,	_i = _j.image
;

const Frame = function (image, innerBorder) {
	this._init(image, innerBorder);
}

_j.Frame = Frame;

Frame._getters = _j.hash({
	'red':              function () {return this._getRed()}
,	'green':            function () {return this._getGreen()}
,	'blue':             function () {return this._getBlue()}
,	'rgb':              function () {return this._getRGB()}
,	'gray':             function () {return this._getGray()}
,	'yuv':              function () {return this._getYUV()}
,	'equalized':        function () {return this._getEqualized()}
,	'laplacian':        function () {return this._getEdge('laplacian')}
,	'laplacian.signed': function () {return this._getEdge('laplacian.signed')}
,	'sobel':            function () {return this._getEdge('sobel')}
,	'sobel.rgb':        function () {return this._getEdge('sobel.rgb')}
,	'argb':             function () {return this._getARGB()}
,	'gray-a':           function () {return this._getAccumedGray()}
,	'rgb-a':            function () {return this._getAccumedRGB()}
,	'yuv-a':            function () {return this._getAccumedYUV()}
,	'gray-d':           function () {return this._getDeltaGray()}
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
	_init: function (imageData, innerBorder) {
		if (!(imageData instanceof ImageData))
			_j.fatal(new Error('Frame requires a source ImageData'));
		
		(innerBorder === undefined) && (innerBorder = 0);

		const	width  = imageData.width
		,	height = imageData.height
		,	num    = width * height
		,	iNum   = (width - innerBorder * 2) * (height - innerBorder * 2)
		;

		this.shape = ()=>([width, height, innerBorder]);
		this.num  = ()=>(num);
		this.innerNum = ()=>(iNum);
		this._histogram = _j.hash();
		this._luminance = _j.hash();
		this.getter = _j.hash({
			'ImageData': ()=>(imageData)
		,	'rgba':      ()=>(imageData.data)
		});
		this.attachment = ()=>(_j.hash({afactor:0.5}));
	}
	, attach: function (tag, data) {
		const hash = this.attachment();
		hash[tag] = data;
		this.attachment = ()=>(hash);
	}
	, detach: function (tag) {
		const hash = this.attachment();
		if (!hash || !hash[tag])
			return
		delete hash[tag]
		this.attachment = ()=>(hash);
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
			return _j.hash.keys(this._histogram)
		return this._histogram[tag]()
	}
	, luminance: function (tag) {
		if (!tag) 
			return _j.hash.keys(this._luminance)
		return this._luminance[tag]()
	}
	, __getComponent: function (index) {
		const	num  = this.num()
		,	C = _i.array('plane', num)
		,	hC = _i.array('histogram', 1)
		,	lum = [[0]]
		,	bTag = ['red', 'green', 'blue'][index]
		,	cTag = ['r', 'g', 'b'][index]
		;
		_i.convert(['argb', this.get('argb')], [cTag, C]);
		_i.stat([hC], lum, [C], this.shape());
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
	, _getRGB: function () {
		const	rgb = _i.chop3(_i.array('rgb', this.num()))
		;
		_i.convert(['rgba', this.get('rgba')], ['rgb', rgb]);
 		this.set('buffer', ['rgb', rgb]);

		const	hRGB = _i.chop3(_i.array('histogram', 3))
		,	lum = [0,0,0]
		;
		_i.stat(hRGB, lum, rgb, this.shape());
		this.set('histogram', ['red',   hRGB[0]]);
		this.set('histogram', ['green', hRGB[1]]);
		this.set('histogram', ['blue',  hRGB[2]]);
		this.set('luminance', ['red',   lum[0]]);
		this.set('luminance', ['green', lum[1]]);
		this.set('luminance', ['blue',  lum[2]]);

		return this.get('rgb')
	}
	, _getEqualized: function () {
		const	eq = _i.array('gray', this.num())
		,	hE = _i.array('histogram', 1)
		,	lE = [[0]]
		,	g = this.get('gray')
		,	_e = _i.equalize
		;
		_j.use([[Uint8ClampedArray, 256]], (_eqLUT)=>{
			_e.lut(_eqLUT, this.histogram('gray'), this.innerNum());
			_e.map(eq, g, _eqLUT);
		});
		_i.stat([hE], lE, [eq], this.shape());
		this.set('buffer',    ['equalized', eq   ]);
		this.set('histogram', ['equalized', hE   ]);
		this.set('luminance', ['equalized', lE[0]]);

		return this.get('equalized')
	}
	, _getYUV: function () {
		const	num = this.num()
		,	yuv = _i.chop3(_i.array('yuv', num))
		,	hY = _i.array('histogram', 1)
		,	lum = [[0]]
		;
		_i.convert(['argb', this.get('argb')], ['yuv', yuv]);
		_i.stat([hY], lum, [yuv[0]], this.shape());

		this.set('buffer',    ['yuv', yuv   ]);
		this.set('histogram', ['y',   hY    ]);
		this.set('luminance', ['y',   lum[0]]);
		return this.get('yuv');
	}
	, _getGray: function () {
		const	num = this.num()
		,	gray = _i.array('gray', num)
		,	hG = _i.array('histogram', 1)
		,	lum = [[0]]
		;
		_i.convert(['argb', this.get('argb')], ['gray', gray]);
		_i.stat([hG], lum, [gray], this.shape());
		this.set('buffer',    ['gray', gray  ]);
		this.set('histogram', ['gray', hG    ]);
		this.set('luminance', ['gray', lum[0]]);
		return this.get('gray');
	}
	, _getEdge: function (method) {
		const e = _i.array('gray', this.num())
		,     w = this.shape()[0]
		;

		if (method == 'sobel.rgb') {
			const plane = this.get('rgb')
			,     R = plane[0]
			,     G = plane[1]
			,     B = plane[2]
			,     num = this.num()
			,     ePlane = _i.chop3(_i.array('rgb', num))
			,     eR = ePlane[0]
			,     eG = ePlane[1]
			,     eB = ePlane[2]
			;
			_i.sobel(eR, R, w);
			_i.sobel(eG, G, w);
			_i.sobel(eB, B, w);
			for (let i = 0; i < num; ++i)
				e[i] = Math.max(eR[i], eG[i], eB[i]);
		}
		else if (method == 'laplacian') {
			_j.use([[Int16Array, e.length]], (raw)=>{
				_i.laplacian(raw, this.get('gray'), w);
				for (let i = 0; i < e.length; ++i) 
					e[i] = Math.abs(raw[i]);
			});
		}
		else if (method == 'laplacian.signed') {
			_j.use([[Int16Array, e.length]], (raw)=>{
				_i.laplacian(raw, this.get('gray'), w);
				for (let i = 0; i < e.length; ++i) 
					e[i] = raw[i] + 128;
			});
		}
		else if (method == 'sobel') {
			_i.sobel(e, this.get('gray'), w);
		}
		else _j.fatal(new Error('not supported ' + method));

		const	hE = _i.array('histogram', 1)
		,	lum = [0]
		;
		_i.stat([hE], lum, [e], this.shape());

		this.set('buffer',    [method, e     ]);
		this.set('histogram', [method, hE    ]);
		this.set('luminance', [method, lum[0]]);
		return this.get(method);
	}
	, _getARGB: function () {
		const	argb = _i.array('argb', this.num());
		
		_i.convert(['rgba', this.get('rgba')], ['argb', argb]);
		this.set('buffer', ['argb', argb]);

		return this.get('argb')
	}
	, _getAccumedGray: function () {
		const	num = this.num();
		let	{abuf} = this.attachment();
		if (!abuf || (abuf.length !== num)) {
			abuf = _i.array('gray', num);
			_i.convert(['argb', this.get('argb')], ['gray', abuf]);
			this.attach('abuf', abuf);
		}

		_i.blend('gray', this.get('argb'), [abuf], this.attachment().afactor);

		const	grayAccumed = _i.array('gray', num)
		,	hG = _i.array('histogram', 1)
		,	lum = [[0]]
		;
		grayAccumed.set(abuf);
		_i.stat([hG], lum, [grayAccumed], this.shape());
		this.set('buffer',    ['gray-a', grayAccumed]);
		this.set('histogram', ['gray-a', hG         ]);
		this.set('luminance', ['gray-a', lum[0]     ]);
		return this.get('gray-a');
	}
	, _getAccumedRGB: function () {
		const	num = this.num();
		let	{abuf, atype} = this.attachment()
		;
		if (!abuf || (abuf.length !== (num * 3)) || (atype !== 'rgb')) {
			abuf = _i.array('rgb', num);
			_i.convert(['argb', this.get('argb')]
			,          ['rgb', _i.chop3(abuf)]
			);
			this.attach('abuf', abuf);
			this.attach('atype', 'rgb');
		}

		const	rgb = _i.chop3(abuf);
		_i.blend('rgb', this.get('argb'), rgb, this.attachment().afactor);

		const	rgbAccumed = _i.chop3(_i.array('rgb', num))
		,	hRGB = _i.chop3(_i.array('histogram', 3))
		,	lum = [0,0,0]
		;
		rgbAccumed[0].set(rgb[0]);
		rgbAccumed[1].set(rgb[1]);
		rgbAccumed[2].set(rgb[2]);
		this.set('buffer', ['rgb-a', rgbAccumed]);

		_i.stat(hRGB, lum, rgbAccumed, this.shape());
		this.set('histogram', ['red-a',   hRGB[0]]);
		this.set('histogram', ['green-a', hRGB[1]]);
		this.set('histogram', ['blue-a',  hRGB[2]]);
		this.set('luminance', ['red-a',   lum[0]]);
		this.set('luminance', ['green-a', lum[1]]);
		this.set('luminance', ['blue-a',  lum[2]]);

		return this.get('rgb-a');
	}
	, _getAccumedYUV: function () {
		const	num = this.num()
		,	argb = this.get('argb')
		;
		let	{abuf, atype} = this.attachment()
		;
		if (!abuf || (abuf.length !== (num * 3)) || (atype !== 'yuv')) {
			abuf = _i.array('yuv', num);
			_i.convert(['argb', argb]
			,          ['yuv', _i.chop3(abuf)]
			);
			this.attach('abuf', abuf);
			this.attach('atype', 'yuv');
		}

		const	yuv = _i.chop3(abuf);
		_i.blend('yuv', argb, yuv, this.attachment().afactor);

		const	yuvAccumed = _i.chop3(_i.array('yuv', num))
		,	hY = _i.array('histogram', 1)
		,	lum = [0]
		;
		yuvAccumed[0].set(yuv[0]);
		yuvAccumed[1].set(yuv[1]);
		yuvAccumed[2].set(yuv[2]);
		this.set('buffer', ['yuv-a', yuvAccumed]);

		_i.stat([hY], lum, [yuvAccumed[0]], this.shape());
		this.set('histogram', ['y-a', hY]);
		this.set('luminance', ['y-a', lum[0]]);

		return this.get('yuv-a');
	}
	, _getDeltaGray: function () {
		const	num = this.num()
		,	argb = this.get('argb')
		;

		let	{abuf, atype, pbuf, ptype} = this.attachment();
		if (!pbuf || (pbuf.length !== num) || (ptype != 'gray')) {
			pbuf = _i.array('gray', num);
			_i.convert(['argb', argb], ['gray', pbuf]);
			this.attach('pbuf', pbuf);
			this.attach('ptype', 'gray');
		}
		if (!abuf || (abuf.length !== num) || (atype !== 'gray')) {
			abuf = _i.array('gray', num);
			abuf.set(pbuf);
			this.attach('abuf', abuf);
			this.attach('atype', 'gray');
		}

		_i.blend('y2y', pbuf, [abuf], this.attachment().afactor);

		_i.convert(['argb', argb], ['gray', pbuf]);
		this.attach('pbuf', pbuf);

		const	grayDelta = _i.array('gray', num);
		_i.diff([[pbuf], [abuf]], [grayDelta]);
		this.set('buffer', ['gray-d', grayDelta]);

		return this.get('gray-d');
	}
}

});
