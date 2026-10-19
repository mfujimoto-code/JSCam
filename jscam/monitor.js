'use strict';

jsCam.initFn.push((kparam)=>{
const _j = jsCam;

let _weakref = [];

const _validate = ()=>{
	const	total = _weakref.length
	,	live = []
	;
	_weakref.forEach((wr)=>{
		if (wr.deref() === undefined)
			return
		live.push(wr);
	});
	_weakref = live;

	return	[live.length, total]
}

const _register = (obj)=>{
	obj.forEach((o)=>{
		_weakref.push(new WeakRef(o));
	});
}

_j.monitor = (...obj)=>{
	if (obj.length === 0)
		return _validate()

	_register(obj);
};

const _newObj = (target, ...param)=>{
	const object = new target(...param);

	_j.monitor(object);

	return object
};

_j.newObj = _newObj;

});
