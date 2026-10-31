'use strict';

// const jsCam is a page lexical binding, not window.jsCam.
// Evaluate a source string in the page (IIFE). Do not pass a function object.
const jscamEval = (page, source) => page.evaluate(source);

module.exports = { jscamEval };
