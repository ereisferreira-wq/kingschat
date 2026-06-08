require("reflect-metadata");
const db = require("./dist/shared/database").default;

(async () => {
  await db.authenticate();
  const { User, Company } = require("./dist/shared/database/models");
  const admin = await User.findOne({ where: { role: "admin" } });
  console.log("Admin found:", !!admin);
  if (admin) {
    console.log("ID:", admin.id);
    console.log("Email:", admin.email);
    console.log("Role:", admin.role);
    console.log("Super:", admin.super);
    console.log("IsActive:", admin.isActive);
    console.log("CompanyId:", admin.companyId);
    const comp = await Company.findByPk(admin.companyId);
    console.log("Admin's company status:", comp?.status);
  }
  const companies = await Company.findAll();
  console.log("All companies:", JSON.stringify(companies.map(c => ({ id: c.id, name: c.name, status: c.status }))));
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
