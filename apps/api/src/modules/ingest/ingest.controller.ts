// CONTROLLER layer: HTTP only. Parses the multipart upload with multer (disk
// storage -> temp files), checks all three datasets are present, hands the temp
// paths to the service, and maps results/errors to responses (200, 400).

import os from "node:os";
import { unlink } from "node:fs/promises";
import { Router, type Request, type Response } from "express";
import multer, { MulterError } from "multer";
import { ingestDatasets } from "./ingest.service";

// Room for the full ~128 MB transactions file, but bounded so an upload can't fill
// the disk. Over-limit uploads surface as a MulterError -> 400 below.
const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200 MB
const FIELDS = ["households", "products", "transactions"] as const;

const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: MAX_FILE_SIZE },
}).fields(FIELDS.map((name) => ({ name, maxCount: 1 })));

// Run multer as a promise so its errors (too large, unexpected field) become a 400
// here instead of falling through to Express's default 500 handler.
function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

type UploadedFiles = Record<string, Express.Multer.File[]> | undefined;

export const ingestRouter = Router();

ingestRouter.post("/", async (req, res) => {
  try {
    await runUpload(req, res);
  } catch (err) {
    const message =
      err instanceof MulterError ? `Upload failed: ${err.message}.` : "Upload failed.";
    return res.status(400).json({ error: message });
  }

  const files = req.files as UploadedFiles;
  const present = FIELDS.map((name) => files?.[name]?.[0]).filter(
    (f): f is Express.Multer.File => Boolean(f),
  );
  const missing = FIELDS.filter((name) => !files?.[name]?.[0]);

  if (missing.length > 0) {
    // Some files may have arrived; don't leave them on disk.
    await Promise.allSettled(present.map((f) => unlink(f.path)));
    return res
      .status(400)
      .json({ error: `Missing required file(s): ${missing.join(", ")}.` });
  }

  try {
    const report = await ingestDatasets({
      households: files!.households[0].path,
      products: files!.products[0].path,
      transactions: files!.transactions[0].path,
    });
    res.json(report);
  } catch (error) {
    // A parse/clean error (bad column or value) means the upload was malformed.
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to load the uploaded data.";
    res.status(400).json({ error: message });
  }
});
