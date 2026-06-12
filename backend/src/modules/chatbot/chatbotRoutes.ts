import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import { getConfig, updateConfig, generatePrompt, listModels } from "./chatbotController";

const chatbotRoutes = Router();

chatbotRoutes.get("/chatbot/config", isAuth, getConfig);
chatbotRoutes.put("/chatbot/config", isAuth, updateConfig);
chatbotRoutes.post("/chatbot/generate-prompt", isAuth, generatePrompt);
chatbotRoutes.get("/chatbot/models", isAuth, listModels);

export default chatbotRoutes;
