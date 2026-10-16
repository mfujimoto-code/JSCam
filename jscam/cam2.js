'use strict';

// Bump on every change (UTC YYYY.MM.DD-HHMMSSZ-<git short HEAD at edit>).
const JSCAM_VERSION = '2026.10.16-003446Z-c8c7ed0';

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

_j.log = (...msg)=>{
	console.log(...msg)
};

})();
