const { Sequelize } = require('sequelize');
const sequelize = new Sequelize({ dialect: 'sqlite', storage: './data/kmenu.sqlite', logging: false });
async function main() {
  await sequelize.authenticate();
  const [users] = await sequelize.query('SELECT id, name, email, role FROM users');
  console.log('Users:', JSON.stringify(users));
  await sequelize.close();
}
main().catch(console.error);
