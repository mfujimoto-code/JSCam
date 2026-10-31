'use strict';

// Page-side helpers. Concatenate in front of an IIFE passed to jscamEval.
const PIXEL_SRC = `
const solid = (w, h, r, g, b, a) => {
	if (a === undefined) a = 255;
	const im = new ImageData(w, h);
	const d = im.data;
	for (let i = 0; i < d.length; i += 4) {
		d[i] = r; d[i+1] = g; d[i+2] = b; d[i+3] = a;
	}
	return im;
};
const pack = (r, g, b, a) => ((a << 24) | (r << 16) | (g << 8) | b) >>> 0;
`;

module.exports = { PIXEL_SRC };
