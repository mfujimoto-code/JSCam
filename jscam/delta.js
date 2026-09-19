'use strict';

const delta = {
	aBuffer: []
	, factor: 0.5
	, time:  100
	, _delta: new Uint8ClampedArray(0)
	, _last: performance.now()
	, _next: []
	, accum: (frame) => {
		const current = frame.getGray();
		if (current.length > delta.aBuffer.length) {
			delta.aBuffer = new Array(current.length);
			delta.aBuffer.fill(0);
		}

		const now = performance.now();
		if (now - delta._last < delta.time) return

		delta._calc(delta.aBuffer, delta.aBuffer, delta._next);
		delta._last = now;
		delta._next = current;
	}
	, _calc: (dst, src1, src2) => {
		const f = delta.factor
		, o = 1 - delta.factor
		, num = Math.min(src1.length, src2.length)
		;
		for (let i = 0; i < num; ++i) {
			dst[i] = o * src1[i] + f * src2[i];
		}
	}
	, get: (frame) => {
		delta.accum(frame);

		const a = delta.aBuffer
		, g = frame.getGray()
		;
		if (g.length > delta._delta.length)
			delta._delta = new Uint8ClampedArray(g.length);

		const out = delta._delta
		, num = Math.min(a.length, g.length)
		;
		for (let i = 0; i < num; ++i) {
			out[i] = Math.abs(g[i] - a[i]);
		}
		return out
	}
}
