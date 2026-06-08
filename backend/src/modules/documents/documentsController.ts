import { Request, Response } from "express";
import * as path from "path";
import * as fs from "fs";
import Document from "../../shared/database/models/Document";
import { processDocument } from "../rag/ragService";
import logger from "../../shared/utils/logger";
import { checkDocumentLimit } from "../../shared/utils/planLimits";

const uploadDir = path.resolve(__dirname, "../../../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

export async function list(req: Request, res: Response) {
  const documents = await Document.findAll({
    where: { companyId: req.companyId },
    order: [["createdAt", "DESC"]],
  });
  res.json({ documents });
}

export async function upload(req: Request, res: Response) {
  const file = req.file;
  if (!file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const docLimit = await checkDocumentLimit(req.companyId);
  if (!docLimit.allowed) {
    return res.status(403).json({
      error: "Limite de documentos atingido",
      limit: "documents",
      current: docLimit.current,
      max: docLimit.max,
    });
  }

  if (file.mimetype !== "application/pdf") {
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: "Only PDF files allowed" });
  }

  const doc = await Document.create({
    name: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    path: file.path,
    status: "processing",
    companyId: req.companyId,
  });

  try {
    const result = await processDocument(
      doc.id,
      req.companyId,
      file.path,
      req.body.aiProvider
    );
    await doc.update({ status: "ready", extractedText: "Processed" });
    logger.info(`Document ${doc.id} processed: ${result.chunks} chunks`);
  } catch (error) {
    await doc.update({ status: "error" });
    logger.error(`Error processing document ${doc.id}:`, error);
  }

  res.status(201).json({ document: doc });
}

export async function remove(req: Request, res: Response) {
  const { id } = req.params;
  const doc = await Document.findOne({
    where: { id, companyId: req.companyId },
  });

  if (!doc) {
    return res.status(404).json({ error: "Document not found" });
  }

  if (fs.existsSync(doc.path)) {
    fs.unlinkSync(doc.path);
  }

  await doc.destroy();
  res.json({ message: "Document removed" });
}
