import "reflect-metadata";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./modules/auth/authRoutes";
import whatsappRoutes from "./modules/whatsapp/whatsappRoutes";
import chatbotRoutes from "./modules/chatbot/chatbotRoutes";
import ticketsRoutes from "./modules/tickets/ticketsRoutes";
import documentsRoutes from "./modules/documents/documentsRoutes";
import subscriptionRoutes from "./modules/subscriptions/subscriptionRoutes";
import companyRoutes from "./modules/company/companyRoutes";
import crmRoutes from "./modules/crm/crmRoutes";
import schedulerRoutes from "./modules/scheduler/schedulerRoutes";
import { errorHandler } from "./shared/middleware/errorHandler";

const app = express();

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(authRoutes);
app.use(whatsappRoutes);
app.use(chatbotRoutes);
app.use(ticketsRoutes);
app.use(documentsRoutes);
app.use(subscriptionRoutes);
app.use(companyRoutes);
app.use(crmRoutes);
app.use(schedulerRoutes);

app.use(errorHandler);

export default app;
