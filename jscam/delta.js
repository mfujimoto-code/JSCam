'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const delta = {
	_delta: new Uint8ClampedArray(0)
	, accum: new _j.Accum()
	, _absPlane: (out, src, acc, num) => {
		for (let i = 0; i < num; ++i)
			out[i] = Math.abs(src[i] - acc[i]);
	}
	, get: (frame, space) => {
		if (space === undefined) space = 'gray';
		delta.accum.update(frame, space);

		const	num = frame.num()
		,	acc = delta.accum.planes(space)
		;
		if (space === 'gray') {
			if (num > delta._delta.length) {
				delta._delta = new Uint8ClampedArray(num);
				_j.monitor(delta._delta);
			}
			const	g = frame.get('gray')
			,	out = delta._delta
			,	n = Math.min(acc[0].length, g.length, out.length)
			;
			delta._absPlane(out, g, acc[0], n);
			return out
		}

		if (space === 'rgb') {
			const cur = frame.get('rgb')
			, out = [
				  new Uint8ClampedArray(num)
				, new Uint8ClampedArray(num)
				, new Uint8ClampedArray(num)
			]
			, n = Math.min(acc[0].length, num)
			;

			_j.monitor(out[0], out[1], out[2]);

			for (let k = 0; k < 3; ++k)
				delta._absPlane(out[k], cur[k], acc[k], n);
			return out
		}

		const	yuv = frame.get('yuv')
		,	Y = yuv[0]
		,	U = yuv[1]
		,	V = yuv[2]
		,	out = [
				new Uint8ClampedArray(num)
			,	new Uint8ClampedArray(num)
			,	new Uint8ClampedArray(num)
			]
		,	n = Math.min(acc[0].length, num)
		,	aY = acc[0]
		,	aU = acc[1]
		,	aV = acc[2]
		;

		_j.monitor(out[0], out[1], out[2]);

		for (let i = 0; i < n; ++i) {
			out[0][i] = Math.abs(Y[i] - aY[i]);
			out[1][i] = Math.abs(U[i] - aU[i]);
			out[2][i] = Math.abs(V[i] - aV[i]);
		}
		return out
	}
};

_j.delta = delta;

});
