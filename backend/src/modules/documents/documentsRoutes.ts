import { Router } from "express";
import multer from "multer";
import { isAuth } from "../../shared/middleware/auth";
import { list, upload, remove } from "./documentsController";

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = require("path").resolve(__dirname, "../../../uploads");
    if (!require("fs").existsSync(dir)) {
      require("fs").mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = require("path").extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const uploadMulter = multer({
  storage: uploadStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files allowed"));
    }
  },
});

const documentsRoutes = Router();

documentsRoutes.get("/documents", isAuth, list);
documentsRoutes.post(
  "/documents/upload",
  isAuth,
  uploadMulter.single("file"),
  upload
);
documentsRoutes.delete("/documents/:id", isAuth, remove);

export default documentsRoutes;
