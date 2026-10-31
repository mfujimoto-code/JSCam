'use strict';

const isFull = () => process.env.JSCAM_SUITE === 'full';

module.exports = { isFull };
