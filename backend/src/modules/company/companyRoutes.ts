import { Router } from "express";
import { isAuth, isAdmin } from "../../shared/middleware/auth";
import { getCompany, updateCompany, listCompanies, approveCompany, blockCompany } from "./companyController";
import { deleteCompanyData } from "./companyDeleteController";

const companyRoutes = Router();

companyRoutes.get("/company", isAuth, getCompany);
companyRoutes.put("/company", isAuth, updateCompany);
companyRoutes.post("/company/delete-data", isAuth, isAdmin, deleteCompanyData);

companyRoutes.get("/admin/companies", isAuth, isAdmin, listCompanies);
companyRoutes.put("/admin/companies/:id/approve", isAuth, isAdmin, approveCompany);
companyRoutes.put("/admin/companies/:id/block", isAuth, isAdmin, blockCompany);

export default companyRoutes;
