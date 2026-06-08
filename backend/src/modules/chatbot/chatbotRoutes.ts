import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import { getConfig, updateConfig } from "./chatbotController";

const chatbotRoutes = Router();

chatbotRoutes.get("/chatbot/config", isAuth, getConfig);
chatbotRoutes.put("/chatbot/config", isAuth, updateConfig);

export default chatbotRoutes;
