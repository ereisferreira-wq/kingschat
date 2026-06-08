import { Router } from "express";
import multer from "multer";
import { isAuth, isAdmin, isSuper } from "../../shared/middleware/auth";
import {
  listPlans, createPlan, updatePlan,
  getMySubscription, updateSubscription,
  getUpgradeCost, requestUpgrade,
  approveUpgrade, rejectUpgrade, getPlanUsageEndpoint,
} from "./subscriptionController";
import path from "path";
import fs from "fs";

const upgradeDir = path.resolve(__dirname, "../../../uploads/upgrades");
if (!fs.existsSync(upgradeDir)) {
  fs.mkdirSync(upgradeDir, { recursive: true });
}

const upgradeUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, upgradeDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `upgrade-${req.companyId}-${Date.now()}${ext}`);
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

const subscriptionRoutes = Router();

subscriptionRoutes.get("/plans", listPlans);
subscriptionRoutes.post("/plans", isAuth, isSuper, createPlan);
subscriptionRoutes.put("/plans/:id", isAuth, isSuper, updatePlan);

subscriptionRoutes.get("/subscription", isAuth, getMySubscription);
subscriptionRoutes.put("/subscription", isAuth, updateSubscription);

subscriptionRoutes.get("/plan-usage", isAuth, getPlanUsageEndpoint);
subscriptionRoutes.get("/upgrade/cost/:planId", isAuth, getUpgradeCost);
subscriptionRoutes.post("/upgrade/request", isAuth, upgradeUpload.single("receipt"), requestUpgrade);
subscriptionRoutes.put("/admin/upgrade/:id/approve", isAuth, isAdmin, approveUpgrade);
subscriptionRoutes.put("/admin/upgrade/:id/reject", isAuth, isAdmin, rejectUpgrade);

export default subscriptionRoutes;
