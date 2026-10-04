'use strict';

const Surface = function (canvas, shape, boostRead, copy) {
	this._init(canvas, shape, boostRead, copy);
};

(() => {
	const	_COLOR8 = [
		[127, 127, 127]
	,	[255,   0,   0]
	,	[  0, 255,   0]
	,	[  0,   0, 255]
	,	[255, 255,   0]
	,	[255,   0, 255]
	,	[  0, 255, 255]
	,	[255, 255, 255]
	]
	;

	const	_getGC = (c, r) => (
		!!r ? c.getContext('2d', {willReadFrequently: true})
		    : c.getContext('2d')
	);

	const _p = Surface.prototype;

	// canvas: a canvas element to make surface
	// rBoost: boost extracting pixels from surface
	// copy:   take a snapshot of canvas and use it 
	_p._init = function (canvas, shape, rBoost, copy) {
		// itinialize properties
		//	_state: internal state
		//	_tc:    target canvas
		//	_gc:    context for rendering to this surface

		this._state = {
			flip:	false		// flip horizontal
		};

		let	tc = canvas;
		if (!tc || copy) {
			tc = document.createElement('canvas');
		}
		const	gc = _getGC(tc, rBoost)
		;

		this._tc = tc;
		this._gc = gc;

		if (!!shape) {
			tc.width  = shape[0];
			tc.height = shape[1];
		}

		if (copy && !!canvas) {
			gc.drawImage(canvas, 0, 0, tc.width, tc.height);
		}
	};
	_p.fit = function (size) {
		const	tc = this._tc
		;
		if (tc.width == size[0] && tc.height == size[1])
			return false

		tc.width = size[0];
		tc.height = size[1];

		this.gFlip(this._state.flip);
		return true
	};
	_p.shape = function () {
		const	tc = this._tc
		;
		return [tc.width, tc.height]
	};
	_p.clientRect = function () {
		const	tc = this._tc
		;
		return tc.getBoundingClientRect()
	};

	_p.show = function (src) {
		if (!src)
			throw new Error('unknown source')

		if (src instanceof Surface)
			src = src._tc;

		const	tc = this._tc
		,	gc = this._gc
		;
		gc.drawImage(src, 0, 0, tc.width, tc.height);
	};

	// internal use for extracting a part of surface
	const	_ic = document.createElement('canvas')
	, 	_igc = _getGC(_ic, true)
	;
	_p.inject = function (imageData) {
		if (!(imageData instanceof ImageData))
			throw new Error('not ImageData')

		if (_ic.width != imageData.width || _ic.height != imageData.height) {
			_ic.width = imageData.width;
			_ic.height = imageData.height;
		}
		_igc.putImageData(imageData, 0, 0);

		const	tc = this._tc
		,	gc = this._gc
		;
		gc.drawImage(
			_ic
		,	0, 0, _ic.width, _ic.height
		,	0, 0, tc.width,  tc.height
		);
	};
	_p.extract = function (scale, offset) {
		const	tc = this._tc
		,	gc = this._gc
		;
		if (scale === undefined
		||  scale === 1) {
			return [gc.getImageData(0, 0, tc.width, tc.height), 0, 0]
		}

		if (scale <= 0 ||  scale > 1)
			throw new Error('not supported ' + scale.toString())

		const	sw = (tc.width  * scale) | 0
		,	sh = (tc.height * scale) | 0
		;
		let	sx = (tc.width  * 0.5 - sw * 0.5) | 0
		,	sy = (tc.height * 0.5 - sh * 0.5) | 0
		,	ox = 0
		,	oy = 0
		;

		if (!!offset) {
			ox = offset[0];
			oy = offset[1];
			let	nx = sx + ox
			,	ny = sy + oy
			;
			if (nx < 0) {
				ox = -sx
				sx = 0;
			} else if (nx + sw > tc.width) {
				ox = (tc.width - sw) - sx
				sx = tc.width - sw;
			} else	sx = nx;
			if (ny < 0) {
				oy = -sy
				sy = 0;
			} else if (ny + sh > tc.height) {
				oy = (tc.height - sh) - sy
				sy = tc.height - sh;
			} else	sy = ny;
		}

		return [gc.getImageData(sx, sy, sw, sh), ox, oy]
	}

	_p.gIdentity = function () {
		this._gc.setTransform(1, 0, 0, 1, 0, 0)
	};
	_p.gFlip = function (yes) {
		const	tc = this._tc
		,	gc = this._gc

		this.gIdentity();

		this._state.flip = yes;
		
		if (!yes) return

		gc.translate(tc.width, 0);
		gc.scale(-1, 1);
	};
	_p.gFillRect = function (x, y, w, h) {
		this._gc.fillRect(x, y, w, h)
	};
	_p.gFillStyle = function (style) {
		this._gc.fillStyle = style
	};
	_p.gClear = function () {
		this._gc.clearRect(
			0, 0
		,	this._tc.width
		,	this._tc.height
		);
	};

	const	_rgba = (n)=>{
		const C = _COLOR8[n % _COLOR8.length];
		return 'rgba(' + C[0] + ',' + C[1] + ',' + C[2] + ',0.5)'
	};
	_p.gBeginHistogram = function (num) {
		const	tc = this._tc;
		this._histogram = {
			color: 0
		,	lineScale: (tc.height / 3) / num
		};
	};
	_p.gEndHistogram = function () {
		delete this._histogram
	};
	_p.gDrawHistogram = function (histogram) {
		const	tc = this._tc
		,	gc = this._gc
		,	hs = this._histogram
		,	max = histogram.reduce((a,b)=>(Math.max(a,b)), 0)
		,	barScale = (tc.height / 3) / max
		;

		gc.fillStyle = _rgba(++hs.color);
		for (let x = 10, i = 0; i < histogram.length; ++i, ++x) {
			const h = histogram[i] * barScale;
			gc.fillRect(x, tc.height - 1 - h, 1, h);
		}
		let y = histogram[0];
		const yStart = tc.height - 1;
		gc.strokeStyle = _rgba(++hs.color);
		gc.lineWidth = 2;
		gc.beginPath();
		gc.moveTo(10, yStart - y * hs.lineScale);
		for (let x = 11, i = 1; i < histogram.length; ++i, ++x) {
			y += histogram[i];
			gc.lineTo(x, yStart - y * hs.lineScale);
		}
		gc.stroke();
	};
})();
