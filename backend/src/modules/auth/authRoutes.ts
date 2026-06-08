import { Router } from "express";
import multer from "multer";
import { login, signup, refreshToken, me, pixInfo, changePassword, adminResetPassword, getUsers } from "./authController";
import { isAuth, isAdmin } from "../../shared/middleware/auth";
import path from "path";
import fs from "fs";

const receiptDir = path.resolve(__dirname, "../../../uploads/receipts");
if (!fs.existsSync(receiptDir)) {
  fs.mkdirSync(receiptDir, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, receiptDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, and PDF files allowed"));
    }
  },
});

const authRoutes = Router();

authRoutes.post("/login", login);
authRoutes.post("/login", login);
authRoutes.post("/signup", upload.single("receipt"), signup);
authRoutes.post("/refresh-token", refreshToken);
authRoutes.get("/me", isAuth, me);
authRoutes.get("/users", isAuth, isAdmin, getUsers);
authRoutes.post("/change-password", isAuth, changePassword);
authRoutes.post("/admin/reset-password", isAuth, isAdmin, adminResetPassword);
authRoutes.get("/pix-info", pixInfo);

export default authRoutes;
