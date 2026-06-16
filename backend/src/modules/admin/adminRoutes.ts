import { Router } from "express";
import { isAuth, isAdmin } from "../../shared/middleware/auth";
import { getNotice, updateNotice } from "./adminController";

const adminRoutes = Router();

adminRoutes.get("/admin/notice", isAuth, getNotice);
adminRoutes.put("/admin/notice", isAuth, isAdmin, updateNotice);

export default adminRoutes;
