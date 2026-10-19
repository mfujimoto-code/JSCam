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
		if (cur && cur[0].length === num) return false
		if (space === 'gray')
			this._buf[space] = [_plane(num)];
		else
			this._buf[space] = [_plane(num), _plane(num), _plane(num)];
		return true
	}

	const _u8clamp = new Uint8ClampedArray(3);
	const _mixGray = function (frame, space) {
		const	f = this.get('factor')
		,	dst = this._buf[space][0]
		,	rgba = this._delay
		,	num = frame.num()
		,	o = 1 - f
		,	gH = _j.newObj(Array, 256)
		;
		let	gTL = 0;
		gH.fill(0);
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			const g = rgba[p  ] * 0.299
			+	  rgba[p+1] * 0.587
			+	  rgba[p+2] * 0.114
			;

			_u8clamp[0] = (dst[i] = o * dst[i] + f * g);

			gTL += g;
			gH[_u8clamp[0]] += 1;

		}
		frame.set('histogram', ['gray-a', gH]);
		frame.set('luminance', ['gray-a', gTL]);
	}

	const _mixRgb = function (frame, space) {
		const	f = this.get('factor')
		,	planes = this._buf[space]
		,	rgba = this._delay
		,	num = frame.num()
		,	o = 1 - f
		,	R = planes[0]
		,	G = planes[1]
		,	B = planes[2]
		,	rH = _j.newObj(Array, 256)
		,	gH = _j.newObj(Array, 256)
		,	bH = _j.newObj(Array, 256)
		;
		let	rTL = 0, gTL = 0, bTL = 0;
		rH.fill(0);
		gH.fill(0);
		bH.fill(0);
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			_u8clamp[0] = (R[i] = o * R[i] + f * rgba[p  ]);
			_u8clamp[1] = (G[i] = o * G[i] + f * rgba[p+1]);
			_u8clamp[2] = (B[i] = o * B[i] + f * rgba[p+2]);

			rTL += R[i];
			gTL += G[i];
			bTL += B[i];

			rH[_u8clamp[0]] += 1;
			gH[_u8clamp[1]] += 1;
			bH[_u8clamp[2]] += 1;
		}

		frame.set('histogram', ['red-a',   rH]);
		frame.set('luminance', ['red-a',   rTL]);
		frame.set('histogram', ['green-a', gH]);
		frame.set('luminance', ['green-a', gTL]);
		frame.set('histogram', ['blue-a',  bH]);
		frame.set('luminance', ['blue-a',  bTL]);
	}

	const _mixYuv = function (frame, space) {
		const	f = this.get('factor')
		,	planes = this._buf[space]
		,	rgba = this._delay
		,	num = frame.num()
		,	o = 1 - f
		,	Y = planes[0]
		,	U = planes[1]
		,	V = planes[2]
		,	yH = _j.newObj(Array, 256)
		;
		let	yTL = 0;
		yH.fill(0);
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			const	r = rgba[p  ]
			,	g = rgba[p+1]
			,	b = rgba[p+2]
			;
			Y[i] = o * Y[i] + f * ( r * 0.299 + g * 0.587 + b * 0.114);
			U[i] = o * U[i] + f * (-r * 0.169 - g * 0.331 + b * 0.500);
			V[i] = o * V[i] + f * ( r * 0.500 - g * 0.419 - b * 0.081);

			yTL += Y[i];
			_u8clamp[0] = Y[i];
			yH[_u8clamp[0]] += 1;

		}
		frame.set('histogram', ['y-a', yH]);
		frame.set('luminance', ['y-a', yTL]);
	}

	Accum.prototype._mix = function (frame, space) {
		if (space === 'gray') {
			_mixGray.call(this, frame, space);
			return
		}
		if (space === 'rgb') {
			_mixRgb.call(this, frame, space);
			return
		}
		_mixYuv.call(this, frame, space);
	}

	Accum.prototype.update = function (frame, space) {
		if (space === undefined) space = 'gray';

		_check(space);

		const num = frame.num();

		if (this._delayNum !== num) {
			this._delay = _j.newObj(Uint8ClampedArray, num * 4);

			this._delayNum = num;
			this._hasDelay = false;
		}

		if (this._ensure(space, num)) {
			this._delay.set(frame.get('rgba'));
			const _factor = this.get('factor');
			this.set('factor', 1);
			this._mix(frame, space);
			this.set('factor', _factor);
		}

		// to avoid using the same source as other processes,
		// use image from the recent past here.
		if (this._hasDelay) this._mix(frame, space);

		frame.set('buffer', [`${space}-a`, this._buf[space]]);

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
});
