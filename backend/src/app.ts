import "reflect-metadata";
import "express-async-errors";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./modules/auth/authRoutes";
import whatsappRoutes from "./modules/whatsapp/whatsappRoutes";
import chatbotRoutes from "./modules/chatbot/chatbotRoutes";
import ticketsRoutes from "./modules/tickets/ticketsRoutes";

import subscriptionRoutes from "./modules/subscriptions/subscriptionRoutes";
import companyRoutes from "./modules/company/companyRoutes";
import crmRoutes from "./modules/crm/crmRoutes";
import schedulerRoutes from "./modules/scheduler/schedulerRoutes";
import contactsRoutes from "./modules/contacts/contactsRoutes";
import { errorHandler } from "./shared/middleware/errorHandler";

const app = express();

app.set("trust proxy", 1);

const frontendUrl = process.env.FRONTEND_URL || "";
const corsOrigins = frontendUrl ? frontendUrl.split(",").map(s => s.trim()) : "*";

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:", "wss:"],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many attempts, try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "Too many requests" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/login", authLimiter);
app.use("/signup", authLimiter);
app.use("/refresh-token", authLimiter);
app.use(authRoutes);
app.use(apiLimiter);
app.use(whatsappRoutes);
app.use(chatbotRoutes);
app.use(ticketsRoutes);
app.use(subscriptionRoutes);
app.use(companyRoutes);
app.use(crmRoutes);
app.use(contactsRoutes);
app.use(schedulerRoutes);

app.use(errorHandler);

export default app;
