import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import { getConfig, updateConfig, generatePrompt } from "./chatbotController";

const chatbotRoutes = Router();

chatbotRoutes.get("/chatbot/config", isAuth, getConfig);
chatbotRoutes.put("/chatbot/config", isAuth, updateConfig);
chatbotRoutes.post("/chatbot/generate-prompt", isAuth, generatePrompt);

export default chatbotRoutes;
