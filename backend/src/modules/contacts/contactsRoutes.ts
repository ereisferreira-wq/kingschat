import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import { updateContact } from "./contactsController";

const contactsRoutes = Router();

contactsRoutes.put("/contacts/:id", isAuth, updateContact);

export default contactsRoutes;
