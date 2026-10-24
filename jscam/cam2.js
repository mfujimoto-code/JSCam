'use strict';

// Bump on every change (UTC YYYY.MM.DD-HHMMSSZ-<git short HEAD at edit>).
const JSCAM_VERSION = '2026.10.24-055824Z-5c82c25';

const jsCam = function () {
};

(()=>{

const _j = jsCam;

_j.version = JSCAM_VERSION;
_j.e = (tag)=>(document.getElementById(tag));
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
