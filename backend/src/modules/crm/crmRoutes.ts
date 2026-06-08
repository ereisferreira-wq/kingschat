import { Router } from "express";
import multer from "multer";
import { isAuth } from "../../shared/middleware/auth";
import { list, getById, create, update, remove, stats, exportCSV, importCSV, bulkSend } from "./crmController";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const crmRoutes = Router();

crmRoutes.get("/crm", isAuth, list);
crmRoutes.get("/crm/stats", isAuth, stats);
crmRoutes.get("/crm/export/csv", isAuth, exportCSV);
crmRoutes.post("/crm/import/csv", isAuth, upload.single("file"), importCSV);
crmRoutes.post("/crm/bulk-send", isAuth, bulkSend);
crmRoutes.get("/crm/:id", isAuth, getById);
crmRoutes.post("/crm", isAuth, create);
crmRoutes.put("/crm/:id", isAuth, update);
crmRoutes.delete("/crm/:id", isAuth, remove);

export default crmRoutes;
