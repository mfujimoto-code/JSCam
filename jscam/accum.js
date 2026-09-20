'use strict';

const accum = {
	factor: 0.5
	, time:  100
	, spaces: Object.freeze(['gray', 'rgb', 'yuv'])
	, _last: performance.now()
	, _delay: new Uint8ClampedArray(0)
	, _delayNum: 0
	, _hasDelay: false
	, _buf: Object.create(null)
	, _y8: new Uint8ClampedArray(1)
	, _check: (space) => {
		if (space !== 'gray' && space !== 'rgb' && space !== 'yuv')
			throw 'not supported ' + space
	}
	, _plane: (num) => {
		const a = new Array(num);
		a.fill(0);
		return a
	}
	, _ensure: (space, num) => {
		const cur = accum._buf[space];
		if (cur && cur[0].length === num) return
		if (space === 'gray')
			accum._buf[space] = [accum._plane(num)];
		else
			accum._buf[space] = [accum._plane(num), accum._plane(num), accum._plane(num)];
	}
	, _mixGray: (dst, rgba, num, f) => {
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
	, _mixRgb: (planes, rgba, num, f) => {
		const o = 1 - f
		, R = planes[0]
		, G = planes[1]
		, B = planes[2]
		;
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			R[i] = o * R[i] + f * rgba[p];
			G[i] = o * G[i] + f * rgba[p+1];
			B[i] = o * B[i] + f * rgba[p+2];
		}
	}
	, _mixYuv: (planes, rgba, num, f) => {
		const o = 1 - f
		, Y = planes[0]
		, U = planes[1]
		, V = planes[2]
		, y8 = accum._y8
		;
		for (let i = 0, p = 0; i < num; ++i, p += 4) {
			const r = rgba[p]
			, g = rgba[p+1]
			, b = rgba[p+2]
			;
			y8[0] = r * 0.299 + g * 0.587 + b * 0.114;
			Y[i] = o * Y[i] + f * y8[0];
			U[i] = o * U[i] + f * (-r * 0.169 - g * 0.331 + b * 0.500);
			V[i] = o * V[i] + f * ( r * 0.500 - g * 0.419 - b * 0.081);
		}
	}
	, _mix: (space, rgba, num) => {
		const f = accum.factor
		, planes = accum._buf[space]
		;
		if (space === 'gray') accum._mixGray(planes[0], rgba, num, f);
		else if (space === 'rgb') accum._mixRgb(planes, rgba, num, f);
		else accum._mixYuv(planes, rgba, num, f);
	}
	, update: (frame, space) => {
		if (space === undefined) space = 'gray';
		accum._check(space);

		const num = frame.num();
		frame.get(space);

		if (accum._delayNum !== num) {
			accum._delay = new Uint8ClampedArray(num * 4);
			accum._delayNum = num;
			accum._hasDelay = false;
		}
		accum._ensure(space, num);

		const now = performance.now();
		if (now - accum._last < accum.time) return

		if (accum._hasDelay) accum._mix(space, accum._delay, num);
		accum._delay.set(frame.get('rgba'));
		accum._hasDelay = true;
		accum._last = now;
	}
	, planes: (space) => {
		if (space === undefined) space = 'gray';
		accum._check(space);
		const p = accum._buf[space];
		if (!p) {
			if (space === 'gray') return [[]];
			return [[], [], []];
		}
		return p
	}
}
