import "reflect-metadata";
import { Sequelize } from "sequelize-typescript";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

import User from "./models/User";
import Company from "./models/Company";
import Plan from "./models/Plan";
import Subscription from "./models/Subscription";
import Whatsapp from "./models/Whatsapp";
import Ticket from "./models/Ticket";
import Contact from "./models/Contact";
import Message from "./models/Message";

import ChatbotConfig from "./models/ChatbotConfig";
import Customer from "./models/Customer";
import ScheduleTask from "./models/ScheduleTask";
import ScheduleLog from "./models/ScheduleLog";
import SystemNotice from "./models/SystemNotice";

const dialect = process.env.DB_DIALECT || "sqlite";

let db: Sequelize;

if (dialect === "sqlite") {
  db = new Sequelize({
    dialect: "sqlite",
    storage: process.env.DB_STORAGE || path.resolve(__dirname, "../../../data/kmenu.sqlite"),
    logging: false,
  });
} else {
  if (!process.env.DB_PASS) {
    throw new Error("DB_PASS environment variable is required for PostgreSQL");
  }

  db = new Sequelize({
    dialect: "postgres",
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "kmenu_ai",
    username: process.env.DB_USER || "kmenu",
    password: process.env.DB_PASS,
    logging: false,
    dialectOptions: {
      ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
    },
  });
}

db.addModels([
  User, Company, Plan, Subscription, Whatsapp,
  Ticket, Contact, Message, ChatbotConfig,
  Customer, ScheduleTask, ScheduleLog, SystemNotice,
]);

export default db;
