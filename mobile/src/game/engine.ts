import type { Engine } from './types';
// Keep the same tested deterministic engine as the browser prototype.
const engine: Engine = require('../../../public/engine.js');
export default engine;
