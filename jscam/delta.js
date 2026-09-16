'use strict';

const delta = {
	//aBuffer: new Uint8ClampedArray(10)
	aBuffer: [0,0,0,0,0,0,0,0,0,0]
	, factor: 0.5
	, time:  100
	, _delta:  [0,0,0,0,0,0,0,0,0,0]
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

		const g = delta._next;
		if (g.length > delta.aBuffer.length) {
			//  delta.aBuffer = new Uint8ClampedArray(g.length)
			delta.aBuffer = new Array(g.length)
			delta.aBuffer.fill(0);
		}

		const a = delta.aBuffer;
		//while (g.length > a.length)
		//a.push(0);
		delta._calc(a, a, g);

		delta._last = now;
		delta._next = frame.getGray();
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
		//, l = new Uint8ClampedArray(a.length)
		, l = new Array(a.length)
		;

		delta._calc(l, a, frame.getGray());

		if (a.length > delta._delta.length)
			delta._delta = new Uint8ClampedArray(a.length);
		const out = delta._delta;
		for (let i = 0; i < l.length; ++i) {
			//const d = l[i] - a[i];
			out[i] = Math.abs(l[i] - a[i]);
			//out[i] = (Math.abs(d) < delta.threshold) ? 0 : d;
		}

		return out
	}
}
