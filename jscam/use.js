'use strict';

jsCam.initFn.push((kparam)=>{
const	_j = jsCam;

const	_LIFESPAN = 1000;

let	_list = []
,	_age = _j.now()
;

const	_release = (e)=>{
	e.age = _age;
	_list.push(e);
}

const	_get = (param)=>{
	const	type = param[0]
	,	size = param[1]
	,	temp = [];
	;

	while (_list.length > 0) {
		const	e = _list.pop();
		if (e.type === type && e.size === size) {
			if (temp.length > 0)
				_list.push(...temp);
			e.age = _age;
			return e
		}
		if (_age - e.age < _LIFESPAN)
			temp.push(e);
	}

	if (temp.length > 0)
		_list.push(...temp);
	
	const ne = _j.hash();

	ne.age  = _age;
	ne.type = type;
	ne.size = size;
	ne.buf  = _j.newObj(type, size);

	return ne
}

const _use = (want, run)=>{
	const	entries = []
	,	buffers = []
	;

	_age = _j.now();
	want.forEach((p)=>{
		const e = _get(p);
		entries.push(e);
		buffers.push(e.buf);
	});

	const r = run(...buffers);

	_age = _j.now();
	entries.forEach((e)=>(_release(e)));

	return r
}

_j.use = _use;

});
