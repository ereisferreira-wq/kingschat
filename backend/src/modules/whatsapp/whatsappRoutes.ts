import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import {
  list,
  create,
  connect,
  disconnect,
  remove,
  status,
} from "./whatsappController";

const whatsappRoutes = Router();

whatsappRoutes.get("/whatsapp", isAuth, list);
whatsappRoutes.post("/whatsapp", isAuth, create);
whatsappRoutes.post("/whatsapp/:id/connect", isAuth, connect);
whatsappRoutes.post("/whatsapp/:id/disconnect", isAuth, disconnect);
whatsappRoutes.delete("/whatsapp/:id", isAuth, remove);
whatsappRoutes.get("/whatsapp/:id/status", isAuth, status);

export default whatsappRoutes;
