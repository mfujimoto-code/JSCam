'use strict';

const Accum = function () {
	this._last = 0;				// last update
	this._delay = new Uint8ClampedArray(0);	// image pixels for next update
	this._delayNum = 0;
	this._hasDelay = false;
	this._getter = Object.create(null);
	this._buf = Object.create(null);

	this.set('factor', Accum.FACTOR);
};

(() => {
	Accum.SPACES = Object.freeze(['gray', 'rgb', 'yuv']);
	Accum.FACTOR = 0.5;
	const _check = (space) => {
		if (!Accum.SPACES.includes(space))
			throw new Error('not supported ' + space)
	};
	const _plane = (num) => {
		const a = new Array(num);
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
		if (cur && cur[0].length === num) return false
		if (space === 'gray')
			this._buf[space] = [_plane(num)];
		else
			this._buf[space] = [_plane(num), _plane(num), _plane(num)];
		return true
	}

	const _mixGray = (dst, rgba, num, f) => {
		const o = 1 - f;
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			const g = Math.round(
				rgba[p] * 0.299
				+ rgba[p+1] * 0.587
				+ rgba[p+2] * 0.114
			);
			dst[i] = o * dst[i] + f * g;
		}
	}
	const _mixRgb = (planes, rgba, num, f) => {
		const	o = 1 - f
		,	R = planes[0]
		,	G = planes[1]
		,	B = planes[2]
		;
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			R[i] = o * R[i] + f * rgba[p];
			G[i] = o * G[i] + f * rgba[p+1];
			B[i] = o * B[i] + f * rgba[p+2];
		}
	}
	const _mixYuv = (planes, rgba, num, f) => {
		const	o = 1 - f
		,	Y = planes[0]
		,	U = planes[1]
		,	V = planes[2]
		;
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			const	r = rgba[p]
			,	g = rgba[p+1]
			,	b = rgba[p+2]
			;
			Y[i] = o * Y[i] + f * ( r * 0.299 + g * 0.587 + b * 0.114);
			U[i] = o * U[i] + f * (-r * 0.169 - g * 0.331 + b * 0.500);
			V[i] = o * V[i] + f * ( r * 0.500 - g * 0.419 - b * 0.081);
		}
	}

	Accum.prototype._mix = function (space, rgba, num) {
		const	f = this.get('factor')
		,	planes = this._buf[space]
		;
		if (space === 'gray') {
			_mixGray(planes[0], rgba, num, f);
			return
		}
		if (space === 'rgb') {
			_mixRgb(planes, rgba, num, f);
			return
		}
		_mixYuv(planes, rgba, num, f);
	}

	Accum.prototype.update = function (frame, space) {
		if (space === undefined) space = 'gray';

		_check(space);

		const num = frame.num();

		// to build histogram
		frame.get(space);

		if (this._delayNum !== num) {
			this._delay = new Uint8ClampedArray(num * 4);
			this._delayNum = num;
			this._hasDelay = false;
		}

		if (this._ensure(space, num)) {
			this._delay.set(frame.get('rgba'));
			const _factor = this.get('factor');
			this.set('factor', 1);
			this._mix(space, this._delay, num);
			this.set('factor', _factor);
		}

		// to avoid using the same source as other processes,
		// use image from the recent past here.
		if (this._hasDelay) this._mix(space, this._delay, num);
		this._delay.set(frame.get('rgba'));
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
})();
