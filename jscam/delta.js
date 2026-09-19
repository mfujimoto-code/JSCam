'use strict';

const delta = {
	_delta: new Uint8ClampedArray(0)
	, _absPlane: (out, src, acc, num) => {
		for (let i = 0; i < num; ++i)
			out[i] = Math.abs(src[i] - acc[i]);
	}
	, get: (frame, space) => {
		if (space === undefined) space = 'gray';
		accum.update(frame, space);

		const num = frame.getNum()
		, acc = accum.planes(space)
		;
		if (space === 'gray') {
			if (num > delta._delta.length)
				delta._delta = new Uint8ClampedArray(num);
			const g = frame.getGray()
			, out = delta._delta
			, n = Math.min(acc[0].length, g.length, out.length)
			;
			delta._absPlane(out, g, acc[0], n);
			return out
		}

		if (space === 'rgb') {
			const cur = frame.get3Planars()
			, out = [
				new Uint8ClampedArray(num)
				, new Uint8ClampedArray(num)
				, new Uint8ClampedArray(num)
			]
			, n = Math.min(acc[0].length, num)
			;
			for (let k = 0; k < 3; ++k)
				delta._absPlane(out[k], cur[k], acc[k], n);
			return out
		}

		const yuv = frame.getYUV()
		, Y = yuv.Y
		, UV = yuv.UV
		, out = [
			new Uint8ClampedArray(num)
			, new Uint8ClampedArray(num)
			, new Uint8ClampedArray(num)
		]
		, n = Math.min(acc[0].length, num)
		, aY = acc[0]
		, aU = acc[1]
		, aV = acc[2]
		;
		for (let i = 0; i < n; ++i) {
			out[0][i] = Math.abs(Y[i] - aY[i]);
			out[1][i] = Math.abs(UV[i * 2] - aU[i]);
			out[2][i] = Math.abs(UV[i * 2 + 1] - aV[i]);
		}
		return out
	}
}

Object.defineProperty(delta, 'factor', {
	get: () => accum.factor
	, set: (v) => { accum.factor = v }
});
Object.defineProperty(delta, 'time', {
	get: () => accum.time
	, set: (v) => { accum.time = v }
});
Object.defineProperty(delta, 'aBuffer', {
	get: () => {
		const g = accum.planes('gray')[0];
		return g || []
	}
});
delta.accum = (frame) => accum.update(frame, 'gray');
