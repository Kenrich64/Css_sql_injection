const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const pool = new Pool({
  connectionString,
});
pool.on('error', (err) => console.error('Unexpected database error:', err.message));
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
    await client.query('DROP TABLE IF EXISTS products CASCADE;');
    await client.query(`
      CREATE TABLE products (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        category VARCHAR(50) NOT NULL,
        price NUMERIC(10, 2) NOT NULL,
        description TEXT,
        released INTEGER NOT NULL DEFAULT 1
      );
    `);
    await client.query(`
      INSERT INTO products (name, category, price, description, released) VALUES
      ('Novelty Hacker Mug', 'Gifts', 14.99, 'Ceramic coffee mug printed with green binary code matrix.', 1),
      ('Cybersecurity Sticker Pack', 'Gifts', 6.50, 'Set of 10 waterproof vinyl stickers for laptops and gear.', 1),
      ('Encrypted Hardware Vault (Prototype)', 'Gifts', 89.00, 'Secret biometric lockbox prototype - Unreleased to public.', 0),
      ('Black Cyber Hoodie', 'Clothing', 49.99, 'Heavyweight cotton hoodie with embroidered terminal prompt.', 1),
      ('Binary Matrix Socks', 'Clothing', 9.99, 'Comfortable crew socks with glowing green binary print.', 1),
      ('Stealth Bomber Jacket (Internal Staff)', 'Clothing', 129.00, 'Unreleased RFID-shielded staff jacket with concealed pockets.', 0),
      ('Mechanical Hackboard', 'Tech', 79.99, 'Compact 60% mechanical keyboard with tactile blue switches.', 1),
      ('USB Payload Drive Shell', 'Tech', 12.50, 'Protective aluminum case designed for test payloads.', 1),
      ('Zero-Day Hardware Debugger (Classified)', 'Tech', 299.99, 'Unreleased enterprise firmware vulnerability scanner probe.', 0),
      ('Web Security Fundamentals', 'Books', 24.99, 'Hands-on introduction to modern application vulnerabilities.', 1),
      ('The SQL Injection Playbook', 'Books', 34.50, 'In-depth manual covering SQL syntax, tautologies, and defenses.', 1),
      ('Advanced Kernel Exploitation (Early Draft)', 'Books', 59.00, 'Confidential unreleased preview edition of kernel security research.', 0);
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
