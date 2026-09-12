import {GlobalWorkerOptions} from "pdfjs-dist";

/**
 * Hands pdf.js the worker this build emits, so parsing happens off the UI thread and a document that spins the
 * parser occupies that worker instead of the window.
 *
 * It is a global of the pdf.js library, so this runs once for the application and not per parse.
 */
export function configurePdfWorker(): void {
  GlobalWorkerOptions.workerPort = new Worker(new URL("./pdf.worker", import.meta.url), {type: "module"});
}
