const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const pool = new Pool({
  connectionString,
});

// retry database connection every 2 seconds, retry approximately 30 times, give up if database remains unavailable
async function connectWithRetry(maxRetries = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      console.log('Successfully connected to PostgreSQL database.');
      return true;
    } catch (err) {
      console.error(`Database connection attempt ${attempt}/${maxRetries} failed: ${err.message}`);
      if (attempt === maxRetries) {
        console.error('Database connection failed after maximum retries. Giving up.');
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// keep identical to database/init.sql
async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    await client.query(`
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(100) NOT NULL,
        role VARCHAR(20) NOT NULL
      );
    `);
    await client.query(`
      INSERT INTO users (username, password, role) VALUES
      ('admin', 'Adm!n@123', 'admin'),
      ('student1', 'pass123', 'student'),
      ('student2', 'pass456', 'student');
    `);
    await client.query('COMMIT');
    console.log('Database seeded successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error seeding database:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  seed,
  connectWithRetry,
};
