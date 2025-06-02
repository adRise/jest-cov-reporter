// This file is a wrapper that imports from the compiled TypeScript version
// All functionality is now maintained in index.ts

// Simply re-export everything from the compiled output
module.exports = require('../lib/index');
