'use strict';

jsCam.initFn.push((kparam)=>{
const _j = jsCam;

let	_afactor = 0.5
;
const	_abuf = new _j.Accum(false, true)
,	_eq = _j.image.equalize
;

const	_stage2 = _j.hash();

_stage2.fn = (state, eqLUT, scale, yTmp)=>{
	const	frame = state.frame
	,	Y = state.yuv[0]
	,	U = state.yuv[1]
	,	V = state.yuv[2]
	;
	yTmp.set(Y);
	_eq.lut(eqLUT, frame.histogram('y-a'), Y.length);
	_eq.map(Y, Y, eqLUT);
	for (let i = 0; i < 256; ++i) {
		const	Ynew = Y[i]>>>0
		,	Yold = yTmp[i]
		;
		scale[i] = (Yold === 0) ? 0 : Ynew / Yold;
	}
	for (let i = 0; i < U.length; ++i) {
		U[i] = U[i] * scale[Y[i]]
	}
	for (let i = 0; i < V.length; ++i) {
		V[i] = V[i] * scale[Y[i]]
	}
}
_stage2.want = [[Uint8ClampedArray, 256], [Float32Array, 256], [Uint8ClampedArray, 0]];

const	_stage = [
	(state)=>{
		_abuf.update(state.frame, 'yuv');
	}
,	(state)=>{
		const	yuv = state.frame.get('yuv-a');
		state.yuv = yuv;
		_stage2.want[2][1] = yuv[0].length;

		_j.use(_stage2.want
		,      (..._use)=>(_stage2.fn(state, ..._use))
		);
	}
,	(state)=>{
		const	frame = state.frame
		,	size = frame.size()
		,	imageData = _j.newObj(ImageData, size[0], size[1])
		;
		_j.image.convert(
			['rgba', imageData.data]
		,	['yuv', state.yuv]
		);
		state.image = imageData;
	}
];

const	_stageFn = (state)=>{
	_stage[state.stage++](state);
	return state
};

_j.render.add(['Night Vision', _stageFn]);

});
