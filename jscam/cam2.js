'use strict';

// Bump on every change (UTC YYYY.MM.DD-HHMMSSZ-<git short HEAD at edit>).
const JSCAM_VERSION = '2026.09.21-055913Z-1cd9e9e';

const e = function(tag) {return document.getElementById(tag);}

const Graph = function * (data, label, canvasName, captionName, color) {
	const AFACTOR = 0.2
	, STEP = 2
	, canvas = e(canvasName)
	, caption = e(captionName)
	, low = Math.round(canvas.width / STEP)
	, high = Math.round(low * 1.5)
	, c = canvas.getContext('2d')
	, values = []
	;

	let last = performance.now();

	(color == undefined) && (color = 'black');
	c.fillStyle = color;

	let min = Infinity, max = -Infinity, sum = 0;
	while (true) {
		yield;
		const now = performance.now();

		if (now == last) continue;

		const duration = now - last;
		last = now;

		const fpc = data.value * 1000 / duration;
		data.value = 0;

		const smoothed = (values.length == 0)
			? fpc
			: (1 - AFACTOR) * values[values.length - 1] + AFACTOR * fpc;
		values.push(smoothed);
		sum += smoothed;
		(max < smoothed) && (max = smoothed);
		(min > smoothed) && (min = smoothed);
		if (values.length > high) {
			while (values.length > low) {
				values.shift();
			}
			max = values.reduce((a,b)=>(Math.max(a,b)));
			min = values.reduce((a,b)=>(Math.min(a,b)));
			sum = values.reduce((a,b)=>(a+b));
		}

		const scale = (max == 0) ? 0 : canvas.height / Math.abs(max);

		caption.innerText =
			label + ' ' + Math.round(sum / values.length)
			+ '  (' + Math.round(min) + '–' + Math.round(max) + ')';

		c.clearRect(0, 0, canvas.width, canvas.height);
		c.fillRect(0, canvas.height - 1, canvas.width, 1);
		for (let x = canvas.width - STEP
			, i = values.length - 1;
			x >= 0 && i >= 0;
			--i, x -= STEP) {
			const h = Math.floor(Math.abs(values[i]) * scale);
			c.fillRect(x, canvas.height - h, STEP, h);
		}
	}
}
