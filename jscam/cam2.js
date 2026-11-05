'use strict';

// Bump on every change (UTC YYYY.MM.DD-HHMMSSZ-<git short HEAD at edit>).
const JSCAM_VERSION = '2026.11.05-193846Z-17ac720';

const jsCam = function () {
};

(()=>{

const _j = jsCam;

_j.version = JSCAM_VERSION;

(typeof document !== 'undefined')    && (_j.e = document.getElementById.bind(document));
(typeof performance !== 'undefined') && (_j.now = performance.now.bind(performance));
(typeof console !== 'undefined')     && (_j.log = console.log.bind(console));

_j.hash = (seed)=>{
	if (!seed)
		return Object.create(null)
	return Object.assign(_j.hash(), seed)
};
_j.hash.keys = (hash)=>(Object.keys(hash));

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

})();
