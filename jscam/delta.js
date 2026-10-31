'use strict';

jsCam.initFn.push((kparam)=>{

const _j = jsCam;

const delta = {
	_delta: new Uint8ClampedArray(0)
	, accum: new _j.Accum(true, false)
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
				delta._delta = _j.newObj(Uint8ClampedArray, num);
			}
			const	g = _j.newObj(Uint8ClampedArray, num)
			,	out = delta._delta
			,	n = Math.min(acc[0].length, g.length, out.length)
			;
			_j.image.convert(['y', g], ['argb', frame.get('argb')]);
			delta._absPlane(out, g, acc[0], n);
			return out
		}

		if (space === 'rgb') {
			const	cur = [
					_j.newObj(Uint8ClampedArray, num)
				,	_j.newObj(Uint8ClampedArray, num)
				,	_j.newObj(Uint8ClampedArray, num)
				]
			,	out = [
					_j.newObj(Uint8ClampedArray, num)
				,	_j.newObj(Uint8ClampedArray, num)
				,	_j.newObj(Uint8ClampedArray, num)
				]
			,	n = Math.min(acc[0].length, num)
			;

			_j.image.convert(['rgb', cur], ['argb', frame.get('argb')]);
			for (let k = 0; k < 3; ++k)
				delta._absPlane(out[k], cur[k], acc[k], n);
			return out
		}

		const	yuv = [
				_j.newObj(Uint8ClampedArray, num)
			,	_j.newObj(Float32Array, num)
			,	_j.newObj(Float32Array, num)
			]
		,	Y = yuv[0]
		,	U = yuv[1]
		,	V = yuv[2]
		,	out = [
				_j.newObj(Uint8ClampedArray, num)
			,	_j.newObj(Uint8ClampedArray, num)
			,	_j.newObj(Uint8ClampedArray, num)
			]
		,	n = Math.min(acc[0].length, num)
		,	aY = acc[0]
		,	aU = acc[1]
		,	aV = acc[2]
		;

		_j.image.convert(['yuv', yuv], ['argb', frame.get('argb')]);

		for (let k = 0; k < 3; ++k)
			delta._absPlane(out[k], yuv[k], acc[k], n);

		return out
	}
};

_j.delta = delta;

});
