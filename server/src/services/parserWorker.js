import { parentPort, workerData } from 'node:worker_threads';
import { parseDocumentInternal } from './parserService.js';

(async () => {
  try {
    const { buffer, originalname } = workerData;
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const result = await parseDocumentInternal(buf, originalname);
    parentPort.postMessage({ success: true, result });
  } catch (err) {
    parentPort.postMessage({
      success: false,
      error: err.message || 'Failed to parse document.',
    });
  }
})();
