'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const Accum = function (noStat, immediate) {
	this._init(noStat, immediate);
};

_j.Accum = Accum;

Accum.SPACES = Object.freeze(['gray', 'rgb', 'yuv']);
Accum.FACTOR = 0.5;
const _check = (space) => {
	if (!Accum.SPACES.includes(space))
		_j.fatal(new Error('not supported ' + space));
};
const _plane = (num) => {
	return _j.newObj(Float32Array, num)
}

const _p = Accum.prototype;

_p.set = function (tag, value) {
	this._getter[tag] = ()=>(value);
}

_p.get = function (tag) {
	return this._getter[tag]()
}

_p._ensure = function (space, num) {
	const cur = this._buf[space];
	if (cur && (cur[0].length === num))
		return false

	this._buf[space] = [_plane(num), _plane(num), _plane(num)];
	return true

}

const _mixGray = function (frame, space, argb) {
	const	f = this.get('factor')
	,	num = frame.num()
	,	inner = this._buf[space][0]
	,	outer = _plane(num)
	,	o = 1 - f
	;
	for (let i = 0; i < num; ++i) {
		const c = argb[i]
		,     g = ((c>>16) & 0xff) * 0.299
		+	  ((c>>8 ) & 0xff) * 0.587
		+	  ((c    ) & 0xff) * 0.114
		;
		inner[i] = o * inner[i] + f * g;
	}

	outer.set(inner);
	frame.set('buffer', ['gray-a', [outer]]);

	if (this._noStat) return

	const	gH = _j.newObj(Uint32Array, 256);
	let	tl = [[0]];
	_j.image.stat([gH], tl, [outer], frame.shape());

	frame.set('histogram', ['gray-a', gH]);
	frame.set('luminance', ['gray-a', tl[0]]);
}

const _mixRgb = function (frame, space, argb) {
	const	f = this.get('factor')
	,	num = frame.num()
	,	o = 1 - f
	,	Rinner = this._buf[space][0]
	,	Ginner = this._buf[space][1]
	,	Binner = this._buf[space][2]
	,	Router = _plane(num)
	,	Gouter = _plane(num)
	,	Bouter = _plane(num)
	;
	for (let i = 0; i < num; ++i) {
		const c = argb[i];
		Rinner[i] = o * Rinner[i] + f * ((c>>16)&0xff);
		Ginner[i] = o * Ginner[i] + f * ((c>>8 )&0xff);
		Binner[i] = o * Binner[i] + f * ((c    )&0xff);
	}

	Router.set(Rinner);
	Gouter.set(Ginner);
	Bouter.set(Binner);
	frame.set('buffer', ['rgb-a', [Router, Gouter, Bouter]]);

	if (this._noStat) return

	const	rH = _j.newObj(Uint32Array, 256)
	,	gH = _j.newObj(Uint32Array, 256)
	,	bH = _j.newObj(Uint32Array, 256)
	,	tl = [[0], [0], [0]]
	;
	_j.image.stat([rH, gH, bH], tl, [Router, Gouter, Bouter], frame.shape());
	frame.set('histogram', ['red-a',   rH]);
	frame.set('histogram', ['green-a', gH]);
	frame.set('histogram', ['blue-a',  bH]);
	frame.set('luminance', ['red-a',   tl[0]]);
	frame.set('luminance', ['green-a', tl[1]]);
	frame.set('luminance', ['blue-a',  tl[2]]);
}

const _mixYuv = function (frame, space, argb) {
	const	f = this.get('factor')
	,	num = frame.num()
	,	o = 1 - f
	,	Yinner = this._buf[space][0]
	,	Uinner = this._buf[space][1]
	,	Vinner = this._buf[space][2]
	,	Youter = _plane(num)
	,	Uouter = _plane(num)
	,	Vouter = _plane(num)
	;
	for (let i = 0; i < num; ++i) {
		const	c = argb[i]
		,	r = (c>>16)&0xff
		,	g = (c>>8 )&0xff
		,	b = (c    )&0xff
		;
		Yinner[i] = o * Yinner[i] + f * ( r * 0.299 + g * 0.587 + b * 0.114);
		Uinner[i] = o * Uinner[i] + f * (-r * 0.169 - g * 0.331 + b * 0.500);
		Vinner[i] = o * Vinner[i] + f * ( r * 0.500 - g * 0.419 - b * 0.081);
	}

	Youter.set(Yinner);
	Uouter.set(Uinner);
	Vouter.set(Vinner);
	frame.set('buffer', ['yuv-a', [Youter, Uouter, Vouter]]);

	if (this._noStat) return

	const	yH = _j.newObj(Uint32Array, 256)
	,	tl = [[0]]
	;
	_j.image.stat([yH], tl, [Youter], frame.shape());
	frame.set('histogram', ['y-a', yH   ]);
	frame.set('luminance', ['y-a', tl[0]]);
}

const _mixer = {
	'gray': _mixGray
,	'rgb':  _mixRgb
,	'yuv':  _mixYuv
};

const _mix = function (frame, space, argb) {
	_mixer[space].call(this, frame, space, argb);
}

const _immediateUpdate = function (frame, space) {
	if (space === undefined) space = 'gray';

	_check(space);

	const	num = frame.num()
	,	argb = frame.get('argb')
	;

	if (this._ensure(space, num)) {
		const _factor = this.get('factor');
		this.set('factor', 1);
		_mix.call(this, frame, space, argb);
		this.set('factor', _factor);
		return
	}

	_mix.call(this, frame, space, argb);
}

const _delayUpdate = function (frame, space) {
	if (space === undefined) space = 'gray';

	_check(space);

	const num = frame.num();

	if (this._delayNum !== num) {
		this._delayNum = num;
		this._hasDelay = false;
	}

	if (this._ensure(space, num)) {
		this._delay = frame.get('argb');
		const _factor = this.get('factor');
		this.set('factor', 1);
		_mix.call(this, frame, space, this._delay);
		this.set('factor', _factor);
	}

	// to avoid using the same source as other processes,
	// use image from the recent past here.
	if (this._hasDelay) 
		_mix.call(this, frame, space, this._delay);

	this._delay = frame.get('argb');
	this._hasDelay = true;
}

_p.planes = function (space) {
	if (space === undefined) space = 'gray';
	_check(space);

	const p = this._buf[space];
	if (p) return p;
	if (space === 'gray') return [[]];
	return [[], [], []];
}

_p._init = function (noStat, immediate) {
	if (!immediate) {
		this._delay = new Uint8ClampedArray(0);	// image pixels for next update
		this._delayNum = 0;
		this._hasDelay = false;
		this.update = _delayUpdate;
	} else {
		this.update = _immediateUpdate;
	}

	this._noStat = !!noStat;

	this._getter = _j.hash();
	this._buf = _j.hash();

	this.set('factor', Accum.FACTOR);
};

});
