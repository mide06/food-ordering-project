
require('dotenv').config();
const app = require('./app');
const sequelize = require('./config/db');
// Import models so Sequelize knows about them
require('./models');

(async () => {
  try {
    // 1️⃣ Test DB connection
    await sequelize.authenticate();
    console.log('MySQL connected successfully');

    // 2️⃣ Sync models -> create tables
    await sequelize.sync({ force: false });
    console.log('Database synchronized');

    // 3️⃣ Start server ONLY after DB is ready
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    });

  } catch (error) {
    console.error('Unable to connect to DB:', error);
  }
})();