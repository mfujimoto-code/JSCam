'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const Accum = function () {
	this._delay = new Uint8ClampedArray(0);	// image pixels for next update
	this._delayNum = 0;
	this._hasDelay = false;
	this._getter = Object.create(null);
	this._buf = Object.create(null);

	this.set('factor', Accum.FACTOR);
};

_j.Accum = Accum;

Accum.SPACES = Object.freeze(['gray', 'rgb', 'yuv']);
Accum.FACTOR = 0.5;
const _check = (space) => {
	if (!Accum.SPACES.includes(space))
		throw new Error('not supported ' + space)
};
const _plane = (num) => {
	const a = _j.newObj(Array, num);
	a.fill(0);
	return a
}

Accum.prototype.set = function (tag, value) {
	this._getter[tag] = ()=>(value);
}

Accum.prototype.get = function (tag) {
	return this._getter[tag]()
}

Accum.prototype._ensure = function (space, num) {
	const cur = this._buf[space];
	if (cur && (cur[0].length === num))
		return false

	this._buf[space] = [_plane(num), _plane(num), _plane(num)];
	return true

}


const _mixGray = function (frame, space, noStat) {
	const	f = this.get('factor')
	,	num = frame.num()
	,	src = this._buf[space][0]
	,	dst = _plane(num)
	,	rgba = this._delay
	,	o = 1 - f
	;
	for (let i = 0, p = 0; i < num; ++i, p += 4) {
		const g = rgba[p  ] * 0.299
		+	  rgba[p+1] * 0.587
		+	  rgba[p+2] * 0.114
		;

		dst[i] = o * src[i] + f * g;
	}

	this._buf[space] = [dst];

	if (noStat) return

	const	gH = _j.newObj(Array, 256);
	let	tl = [[0]];
	gH.fill(0);
	_j.image.stat([gH], tl, [dst]);
	frame.set('histogram', ['gray-a', gH   ]);
	frame.set('luminance', ['gray-a', tl[0]]);
}

const _mixRgb = function (frame, space, noStat) {
	const	f = this.get('factor')
	,	rgba = this._delay
	,	num = frame.num()
	,	o = 1 - f
	,	srcR = this._buf[space][0]
	,	srcG = this._buf[space][1]
	,	srcB = this._buf[space][2]
	,	dstR = _plane(num)
	,	dstG = _plane(num)
	,	dstB = _plane(num)
	;
	for (let i = 0, p = 0; i < num; ++i, p += 4) {
		dstR[i] = o * srcR[i] + f * rgba[p  ];
		dstG[i] = o * srcG[i] + f * rgba[p+1];
		dstB[i] = o * srcB[i] + f * rgba[p+2];
	}

	this._buf[space] = [dstR, dstG, dstB];

	if (noStat) return

	const	rH = _j.newObj(Array, 256)
	,	gH = _j.newObj(Array, 256)
	,	bH = _j.newObj(Array, 256)
	,	tl = [[0], [0], [0]]
	;
	rH.fill(0);
	gH.fill(0);
	bH.fill(0);
	_j.image.stat([rH, gH, bH], tl, [dstR, dstG, dstB]);
	frame.set('histogram', ['red-a',   rH]);
	frame.set('histogram', ['green-a', gH]);
	frame.set('histogram', ['blue-a',  bH]);
	frame.set('luminance', ['red-a',   tl[0]]);
	frame.set('luminance', ['green-a', tl[1]]);
	frame.set('luminance', ['blue-a',  tl[2]]);
}

const _mixYuv = function (frame, space, noStat) {
	const	f = this.get('factor')
	,	rgba = this._delay
	,	num = frame.num()
	,	o = 1 - f
	,	srcY = this._buf[space][0]
	,	srcU = this._buf[space][1]
	,	srcV = this._buf[space][2]
	,	dstY = _plane(num)
	,	dstU = _plane(num)
	,	dstV = _plane(num)
	;
	for (let i = 0, p = 0; i < num; ++i, p += 4) {
		const	r = rgba[p  ]
		,	g = rgba[p+1]
		,	b = rgba[p+2]
		;
		dstY[i] = o * srcY[i] + f * ( r * 0.299 + g * 0.587 + b * 0.114);
		dstU[i] = o * srcU[i] + f * (-r * 0.169 - g * 0.331 + b * 0.500);
		dstV[i] = o * srcV[i] + f * ( r * 0.500 - g * 0.419 - b * 0.081);
	}

	this._buf[space] = [dstY, dstU, dstV];

	if (noStat) return

	const	yH = _j.newObj(Array, 256)
	,	tl = [[0]]
	;
	yH.fill(0);
	_j.image.stat([yH], tl, [dstY]);
	frame.set('histogram', ['y-a', yH   ]);
	frame.set('luminance', ['y-a', tl[0]]);
}

const _mixer = {
	'gray': _mixGray
,	'rgb':  _mixRgb
,	'yuv':  _mixYuv
};

const _mix = function (frame, space, noStat) {
	_mixer[space].call(this, frame, space, noStat);
	frame.set('buffer', [`${space}-a`, this._buf[space]]);
}

Accum.prototype.update = function (frame, space, noStat) {
	if (space === undefined) space = 'gray';

	_check(space);

	const num = frame.num();

	if (this._delayNum !== num) {
		this._delayNum = num;
		this._hasDelay = false;
	}

	if (this._ensure(space, num)) {
		this._delay = frame.get('rgba');
		const _factor = this.get('factor');
		this.set('factor', 1);
		_mix.call(this, frame, space, noStat);
		this.set('factor', _factor);
	}

	// to avoid using the same source as other processes,
	// use image from the recent past here.
	if (this._hasDelay) 
		_mix.call(this, frame, space, noStat);

	this._delay = frame.get('rgba');
	this._hasDelay = true;
}

Accum.prototype.planes = function (space) {
	if (space === undefined) space = 'gray';
	_check(space);

	const p = this._buf[space];
	if (p) return p;
	if (space === 'gray') return [[]];
	return [[], [], []];
}

});	// end jsCam.initFn.push((kparam)=>{..
