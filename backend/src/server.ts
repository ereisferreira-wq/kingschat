import "reflect-metadata";
import app from "./app";
import db from "./shared/database/index";
import { connectRedis } from "./shared/services/redis";
import logger from "./shared/utils/logger";
import Plan from "./shared/database/models/Plan";
import Company from "./shared/database/models/Company";
import User from "./shared/database/models/User";
import { startScheduler } from "./modules/scheduler/schedulerService";
import { startLicenseService } from "./modules/company/licenseService";
import fs from "fs";
import path from "path";

const PORT = process.env.PORT || 3000;

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
        price: 199.90,
        useWhatsApp: true,
        useChatbot: true,
        useRag: true,
        maxDocuments: 3,
      },
      {
        name: "Standard",
        maxUsers: 3,
        maxConnections: 2,
        maxContacts: 600,
        price: 399.90,
        useWhatsApp: true,
        useChatbot: true,
        useRag: true,
        maxDocuments: 10,
      },
      {
        name: "Pro",
        maxUsers: 10,
        maxConnections: 5,
        maxContacts: 1000,
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

  const adminExists = await User.findOne({ where: { role: "admin" } });
  if (adminExists) {
    return;
  }

  const userCount = await User.count();
  if (userCount > 0) {
    logger.warn("No admin user found, but users already exist. Create an admin manually or configure ADMIN_EMAIL/ADMIN_PASSWORD.");
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
    password: adminPassword,
    role: "admin",
    super: true,
    companyId: company.id,
    isActive: true,
  });

  logger.info(`Default admin user created: ${adminEmail}`);
}

async function startup() {
  try {
    await db.authenticate();
    logger.info("Database connected");

    await db.sync();
    logger.info("Database synced");

    await seedPlans();
    await seedAdminUser();

    // Redis is optional — in dev without Docker it's fine to skip
    try {
      await connectRedis();
      logger.info("Redis connected");
    } catch (err: any) {
      logger.warn("Redis not available (optional in dev): " + err.message);
    }

    app.listen(PORT, () => {
      logger.info(`Server running on http://localhost:${PORT}`);
    });

    startScheduler();
    startLicenseService();
  } catch (error) {
    logger.error("Startup error:", error);
    process.exit(1);
  }
}

startup();
