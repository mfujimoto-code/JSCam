'use strict';

// Bump on every change (UTC YYYY.MM.DD-HHMMSSZ-<git short HEAD at edit>).
const JSCAM_VERSION = '2026.10.29-063534Z-6e42734';

const jsCam = function () {
};

(()=>{

const _j = jsCam;

_j.version = JSCAM_VERSION;
_j.e = document.getElementById.bind(document);
_j.now = performance.now.bind(performance);
_j.hash = (seed)=>{
	if (!seed)
		return Object.create(null)
	return Object.assign(_j.hash(), seed)
};

_j.initFn = [];

_j.kick = (param)=>{
	while (_j.initFn.length > 0) {
		const fn = _j.initFn.shift();
		fn(param);
	}
};

_j.fatal = (e)=>{
	_j.log(e.toString());
	throw e
}

_j.log = (...msg)=>{
	console.log(...msg)
};

})();
