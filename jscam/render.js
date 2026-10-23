'use strict';

jsCam.initFn.push((kparam)=>{
const _j = jsCam;

const render = Object.create(null);

_j.render = render;

const _accum = new _j.Accum(false, true);

const _image = function(frame) {
	const size = frame.size()
	,     im = _j.newObj(ImageData, size[0], size[1])
	;
	return im
}

const _hashImageFn = Object.create(null);

const _builtin = Object.assign(Object.create(null), {
	'Raw(RGBA-packed)': (state)=>{
		// SPECIAL - no stage to split
		state.image = state.frame.get('ImageData');
		return state
	}
,	'RGB-planar': (()=>{
		const _stage = [
			(state)=>{
				state.rgb = state.frame.get('rgb')
			}
		,	(state)=>{
				const	imageData = _image(state.frame);
				_j.image.convert(
					['rgba', imageData.data]
				,	['rgb', state.rgb]
				);
				state.image = imageData
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Red': (()=>{
		const _stage = [
			(state)=>{
				state.plane = state.frame.get('red')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.plane]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Green': (()=>{
		const _stage = [
			(state)=>{
				state.plane = state.frame.get('green')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.plane]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Blue': (()=>{
		const _stage = [
			(state)=>{
				state.plane = state.frame.get('blue')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.plane]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'GRAY': (()=>{
		const _stage = [
			(state)=>{
				state.plane = state.frame.get('gray')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.plane]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'GRAY-Histogram equalization': (()=>{
		const _stage = [
			(state)=>{
				state.e = state.frame.get('equalized')
			}
		,	(state)=>{
				const imageData = _image(state.frame);
				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.e]
				);
				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'YUV': (()=>{
		const _stage = [
			(state)=>{
				state.yuv = state.frame.get('yuv')
			}
		,	(state)=>{
				const imageData = _image(state.frame);
				_j.image.convert(
					['rgba', imageData.data]
				,	['yuv', state.yuv]
				);
				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'GRAY-accum': (()=>{
		const _stage = [
			(state)=>{
				_accum.update(state.frame, 'gray');
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['gray', state.frame.get('gray-a')[0]]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'RGB-accum': (()=>{
		const _stage = [
			(state)=>{
				_accum.update(state.frame, 'rgb');
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['rgb', state.frame.get('rgb-a')]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'YUV-accum': (()=>{
		const _stage = [
			(state)=>{
				_accum.update(state.frame, 'yuv');
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['yuv', state.frame.get('yuv-a')]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'BW-delta': (()=>{
		const _stage = [
			(state)=>{
				state.delta = _j.delta.get(state.frame)
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				const	num  = state.frame.num()
				,	data = imageData.data
				,	d = state.delta
				;

				for (let i = 0, o = 0; i < num; ++i, o += 4) {
					const bw = (d[i] == 0) ? 0 : 255;
					data[o  ] =
					data[o+1] =
					data[o+2] = bw;
					data[o+3] = 255;
				}

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Gray-delta': (()=>{
		const _stage = [
			(state)=>{
				state.delta = _j.delta.get(state.frame)
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				const	num  = state.frame.num()
				,	data = imageData.data
				,	d = state.delta
				;
				for (let i = 0, o = 0; i < num; ++i, o += 4) {
					data[o  ] =
					data[o+1] =
					data[o+2] = Math.abs(d[i]);
					data[o+3] = 255;
				}

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'8colors': (()=>{
		const _stage = [
			(state)=>{
				state.rgb = state.frame.get('rgb');
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				const	data = imageData.data
				,	num = state.frame.num()
				,	rgb = state.rgb
				,	R = rgb[0]
				,	G = rgb[1]
				,	B = rgb[2]
				,	f = state.frame
				,	tR = _j.image.otsuThreshold(f.histogram('red'))
				,	tG = _j.image.otsuThreshold(f.histogram('green'))
				,	tB = _j.image.otsuThreshold(f.histogram('blue'))
				;
				for (let i = 0, o = 0; i < num; ++i, o += 4) {
					data[o+0] = R[i] > tR ? 255 : 0;
					data[o+1] = G[i] > tG ? 255 : 0;
					data[o+2] = B[i] > tB ? 255 : 0;
					data[o+3] = 255;
				}

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Edge(Laplacian)': (()=>{
		const _stage = [
			(state)=>{
				state.edge = state.frame.get('laplacian')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.edge]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Edge(Laplacian signed)': (()=>{
		const _stage = [
			(state)=>{
				state.edge = state.frame.get('laplacian.signed')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.edge]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Edge(Sobel)': (()=>{
		const _stage = [
			(state)=>{
				state.edge = state.frame.get('sobel')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				_j.image.convert(
					['rgba', imageData.data]
				,	['luminance', state.edge]
				);

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Edge2(Sobel)': (()=>{
		const _stage = [
			(state)=>{
				state.edge = state.frame.get('sobel')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				const	num  = state.frame.num()
				,	data = imageData.data
				,	e = state.edge
				;
				for (let i = 0, o = 0; i < num; ++i, o += 4) {
					const C = e[i] > 127 ? 255 : 0;
					data[o  ] = 
					data[o+1] = 
					data[o+2] = C;
					data[o+3] = 255;
				}

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
,	'Edge(Bin)': (()=>{
		const _stage = [
			(state)=>{
				state.edge = state.frame.get('sobel')
			}
		,	(state)=>{
				const imageData = _image(state.frame);

				const	num  = state.frame.num()
				,	data = imageData.data
				,	t = _j.image.otsuThreshold(
						state.frame.histogram('sobel')
					)
				,	e = state.edge
				;
				for (let i = 0, o = 0; i < num; ++i, o += 4) {
					data[o+0] =
					data[o+1] =
					data[o+2] = e[i] > t ? 255 : 0;
					data[o+3] = 255;
				}

				state.image = imageData;
			}
		];
		return (state)=>{
			_stage[state.stage++](state);
			return state
		}
	})()
});

let _buildFunc = null;
let _deferred = null;

render.setupMode = ()=>{
	if (_deferred === null)
		return
	_buildFunc = _deferred;
	_deferred = null;
}

render.mode = (param)=>{
	if (param === undefined)
		return Object.keys(_hashImageFn)

	if (!(param in _hashImageFn))
		throw new Error('not supported ' + param)

	if (!_j.dispatch) {
		_buildFunc = _hashImageFn[param];
		return
	}
	_deferred = _hashImageFn[param];
	_j.dispatch.set('schedule');
}

const _changeCB = [];
render.onchange = (cb)=>{
	_changeCB.push(cb)
	cb();
}

render.add = (...param)=>{
	param.forEach((p)=>{
		const	tag = p[0]
		,	stageFn = p[1]
		;
		if (!!_hashImageFn[tag])
			return
		_hashImageFn[tag] = stageFn;
	});
	_changeCB.forEach((cb)=>(cb()));
}

render.remove = (...tags)=>{
	tags.forEach((t)=>{
		if (!_hashImageFn[t])
			return
		delete _hashImageFn[t]
	});
	_changeCB.forEach((cb)=>(cb()));
}

render.add(
	...(Object.keys(_builtin).map((k)=>([k, _builtin[k]])))
);

render.mode(render.mode()[0]);
render.buildImage = (st)=>(_buildFunc(st));

const _setter = {
	'afactor': (v)=>(_accum.set('factor', v))
};

render.set = (tag, value)=>{
	const fn = _setter[tag];
	if (!fn)
		throw new Error('not supported ' + tag)
	fn(value);
};

});
