// Imported for its side effect, as the very first import of each entry point
// (index.js, web/index.web.js) — ES imports run in order, so this starts
// error reporting before the rest of the app's modules load and can throw.
import { initMonitoring } from './monitoring';

initMonitoring();
