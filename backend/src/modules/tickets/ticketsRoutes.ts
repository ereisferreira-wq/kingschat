import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import { list, getById, updateStatus, transferToHuman, sendMessage } from "./ticketsController";

const ticketsRoutes = Router();

ticketsRoutes.get("/tickets", isAuth, list);
ticketsRoutes.get("/tickets/:id", isAuth, getById);
ticketsRoutes.patch("/tickets/:id/status", isAuth, updateStatus);
ticketsRoutes.post("/tickets/:id/transfer", isAuth, transferToHuman);
ticketsRoutes.post("/tickets/:id/messages", isAuth, sendMessage);

export default ticketsRoutes;
