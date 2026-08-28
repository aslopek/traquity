/**
 * The pdf.js worker, as an entry point of this build.
 *
 * It exists so the worker is emitted as a chunk of this application instead of being copied out of `node_modules`
 * as an asset or fetched at runtime: the bundler follows the `new URL('./pdf.worker', import.meta.url)` beside it,
 * and what ships is same-origin, which is all `script-src 'self'` admits.
 */
import "pdfjs-dist/build/pdf.worker.min.mjs";
