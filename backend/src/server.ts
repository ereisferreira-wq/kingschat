import "reflect-metadata";
import http from "http";
import app from "./app";
import db from "./shared/database/index";
import { connectRedis } from "./shared/services/redis";
import logger from "./shared/utils/logger";
import { hash } from "bcryptjs";
import Plan from "./shared/database/models/Plan";
import Company from "./shared/database/models/Company";
import User from "./shared/database/models/User";
import { startScheduler } from "./modules/scheduler/schedulerService";
import { startLicenseService } from "./modules/company/licenseService";
import { initSocket } from "./lib/socket";
import { restoreAllSessions } from "./modules/whatsapp/whatsappService";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 3000;
const server = http.createServer(app);

const dataDir = path.resolve(__dirname, "../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

async function seedPlans() {
  const count = await Plan.count();
  if (count === 0) {
    await Plan.bulkCreate([
      {
        name: "Basic",
        maxUsers: 1,
        maxConnections: 1,
        maxContacts: 300,
        maxProducts: 3,
        maxPersist: 3,
        price: 199.90,
        useWhatsApp: true,
        useChatbot: true,
        useRag: true,
        maxDocuments: 3,
      },
      {
        name: "Standard",
        maxUsers: 3,
        maxConnections: 3,
        maxContacts: 600,
        maxProducts: 5,
        maxPersist: 5,
        price: 399.90,
        useWhatsApp: true,
        useChatbot: true,
        useRag: true,
        maxDocuments: 10,
      },
      {
        name: "Pro",
        maxUsers: 10,
        maxConnections: 10,
        maxContacts: 1000,
        maxProducts: 10,
        maxPersist: 10,
        price: 799.90,
        useWhatsApp: true,
        useChatbot: true,
        useRag: true,
        maxDocuments: 50,
      },
    ]);
    logger.info("Default plans seeded");
  }
}

async function seedAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@kmenu.ai";
  const adminPassword = process.env.ADMIN_PASSWORD || "Kings@Chat2026#Admin";

  const hashedPassword = await hash(adminPassword, 12);

  const adminExists = await User.findOne({ where: { role: "admin" } });
  if (adminExists) {
    await User.update({ passwordHash: hashedPassword, email: adminEmail }, { where: { id: adminExists.id } });
    logger.info(`Admin password synced from .env`);
    return;
  }

  const plan = await Plan.findOne({ where: { isActive: true }, order: [["price", "ASC"]] });
  if (!plan) {
    logger.warn("Admin user cannot be seeded because no plan exists.");
    return;
  }

  const company = await Company.create({
    name: "KMenu Admin Company",
    email: adminEmail,
    phone: "",
    status: true,
    planId: plan.id,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentReceipt: "",
  });

  await User.create({
    name: "Admin",
    email: adminEmail,
    passwordHash: hashedPassword,
    role: "admin",
    super: true,
    companyId: company.id,
    isActive: true,
  });

  logger.info(`Default admin user created: ${adminEmail}`);
}

function validateEnv() {
  const required = ["JWT_SECRET", "JWT_REFRESH_SECRET", "ENCRYPTION_KEY"];
  if (process.env.DB_DIALECT !== "sqlite") {
    required.push("DB_HOST", "DB_USER", "DB_PASS", "DB_NAME");
  }
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    process.exit(1);
  }
  if (process.env.JWT_SECRET === "secret" || process.env.JWT_REFRESH_SECRET === "refresh_secret") {
    logger.error("JWT secrets are still using insecure defaults. Update JWT_SECRET and JWT_REFRESH_SECRET in .env");
    process.exit(1);
  }
}

async function startup() {
  try {
    validateEnv();
    await db.authenticate();
    logger.info("Database connected");

    await db.sync();
    logger.info("Database synced");

    const qi = db.getQueryInterface();
    await qi.addColumn("chatbot_configs", "extractionFields", { type: "TEXT", defaultValue: "nome, cidade, placa" }).catch(() => {});
    await qi.addColumn("contacts", "customFields", { type: "TEXT" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "ollamaBaseUrl", { type: "TEXT", defaultValue: "http://localhost:11434" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "attendantName", { type: "STRING" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "sector", { type: "STRING" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "attendanceInstructions", { type: "TEXT" }).catch(() => {});
    await qi.addColumn("whatsapps", "sector", { type: "STRING", defaultValue: "" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "emojiLevel", { type: "STRING", defaultValue: "moderate" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "aiGoal", { type: "TEXT" }).catch(() => {});
    await qi.addColumn("chatbot_configs", "persistIntervals", { type: "TEXT", defaultValue: "[]" }).catch(() => {});
    await qi.addColumn("plans", "maxProducts", { type: "INTEGER", defaultValue: 3 }).catch(() => {});
    await qi.addColumn("plans", "maxPersist", { type: "INTEGER", defaultValue: 3 }).catch(() => {});
    await qi.addColumn("tickets", "persistIndex", { type: "INTEGER", defaultValue: 0 }).catch(() => {});
    await qi.addColumn("tickets", "sector", { type: "STRING", defaultValue: "" }).catch(() => {});
    await qi.createTable("system_notices", {
      id: { type: "INTEGER", primaryKey: true, autoIncrement: true },
      message: { type: "TEXT" },
      isActive: { type: "BOOLEAN", defaultValue: false },
      scheduledAt: { type: "DATE" },
      createdAt: { type: "DATE" },
      updatedAt: { type: "DATE" },
    }).catch(() => {});
    await qi.addColumn("system_notices", "scheduledAt", { type: "DATE" }).catch(() => {});

    await seedPlans();
    await seedAdminUser();

    // Redis is optional — in dev without Docker it's fine to skip
    try {
      await connectRedis();
      logger.info("Redis connected");
    } catch (err: any) {
      logger.warn("Redis not available (optional in dev): " + err.message);
    }

    initSocket(server);

    server.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });

    startScheduler();
    startLicenseService();
    restoreAllSessions();
  } catch (error) {
    logger.error("Startup error:", error);
    process.exit(1);
  }
}

startup();
