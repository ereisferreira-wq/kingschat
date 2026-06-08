import "reflect-metadata";
import db from "./shared/database";

async function check() {
  await db.authenticate();
  const { User, Company, Plan } = require("./shared/database/models");
  const admin = await User.findOne({ where: { role: "admin" } });
  console.log("Admin found:", !!admin);
  if (admin) {
    console.log("Admin email:", admin.email);
    console.log("Admin super:", admin.super);
    console.log("Admin role:", admin.role);
  }
  const companies = await Company.findAll();
  console.log("Companies:", JSON.stringify(companies.map(c => ({ id: c.id, name: c.name, status: c.status })), null, 2));
  process.exit(0);
}
check().catch(e => { console.error(e); process.exit(1); });
