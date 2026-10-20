const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// In-memory activity log (maximum 200 entries, newest last)
let logs = [];

function addLog({ mode, username, sql, status, outcome }) {
  const entry = {
    time: new Date().toISOString(),
    mode: mode || '',
    username: username || '',
    sql: sql || '',
    status: status || '',
    outcome: outcome || '',
  };
  logs.push(entry);
  if (logs.length > 200) {
    logs.shift();
  }
}

// Parse JSON request bodies
app.use(express.json());

// Handle malformed JSON error gracefully
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      sql: '',
      rows: [],
      status: 'error',
      message: 'Invalid JSON payload',
    });
  }
  next(err);
});

// Serve frontend static files
// Docker may set FRONTEND_DIR to another path.
const frontendDir = process.env.FRONTEND_DIR || path.resolve(__dirname, '../frontend');
app.use(express.static(frontendDir));

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { username, password, mode } = req.body || {};

  // Input validation
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    (mode !== 'vulnerable' && mode !== 'secure')
  ) {
    addLog({
      mode: typeof mode === 'string' ? mode : '',
      username: typeof username === 'string' ? username : '',
      sql: '',
      status: 'error',
      outcome: 'login failed',
    });
    return res.status(400).json({
      success: false,
      sql: '',
      rows: [],
      status: 'error',
      message: 'mode must be vulnerable or secure',
    });
  }

  

  const hasInjectionChars =
    username.includes("'") ||
    username.includes('--') ||
    password.includes("'") ||
    password.includes('--');

  if (mode === 'vulnerable') {
        // SAFETY GUARD (vulnerable mode only): block stacked queries like "; DROP TABLE users"
    // so the lab data cannot be destroyed. Secure mode does not need it.
    if (username.includes(';') || password.includes(';')) {
      addLog({ mode, username, sql: '', status: 'error', outcome: 'login failed' });
      return res.status(200).json({
        success: false,
        sql: '',
        rows: [],
        status: 'error',
        message: 'Multiple statements are not allowed in this lab.',
      });
    }
    // ======================================
    // ===================================
    // VULNERABLE SQL IMPLEMENTATION (EDUCATIONAL LAB ONLY)
    //
    // WARNING: This query is intentionally unsafe and vulnerable to SQL injection.
    // It demonstrates classic SQL injection for educational cybersecurity lab purposes.
    // It must NEVER be used in a real production application.
    // Secure mode demonstrates the safe, industry-standard parameterized SQL approach.
    // =========================================================================
    const sql = `SELECT * FROM users WHERE username='${username}' AND password='${password}'`;

    try {
      const result = await db.query(sql);
      const rows = (result.rows || []).map((r) => ({
        id: r.id,
        username: r.username,
        role: r.role,
      }));

      if (rows.length > 0) {
        const status = hasInjectionChars ? 'vulnerable-bypass' : 'normal';
        addLog({
          mode,
          username,
          sql,
          status,
          outcome: 'login ok',
        });
        return res.status(200).json({
          success: true,
          sql,
          rows,
          status,
          message: `Logged in as ${rows[0].username}`,
        });
      } else {
        addLog({
          mode,
          username,
          sql,
          status: 'normal',
          outcome: 'login failed',
        });
        return res.status(200).json({
          success: false,
          sql,
          rows: [],
          status: 'normal',
          message: 'Invalid credentials',
        });
      }
    } catch (err) {
      addLog({
        mode,
        username,
        sql,
        status: 'error',
        outcome: 'sql error',
      });
      return res.status(200).json({
        success: false,
        sql,
        rows: [],
        status: 'error',
        message: err.message,
      });
    }
  } else {
    // SECURE MODE: Parameterized query (no concatenation)
    const sql = 'SELECT * FROM users WHERE username=$1 AND password=$2';

    try {
      const result = await db.query(sql, [username, password]);
      const rows = (result.rows || []).map((r) => ({
        id: r.id,
        username: r.username,
        role: r.role,
      }));

      if (rows.length > 0) {
        addLog({
          mode,
          username,
          sql,
          status: 'normal',
          outcome: 'login ok',
        });
        return res.status(200).json({
          success: true,
          sql,
          rows,
          status: 'normal',
          message: `Logged in as ${rows[0].username}`,
        });
      } else {
        const status = hasInjectionChars ? 'blocked' : 'normal';
        addLog({
          mode,
          username,
          sql,
          status,
          outcome: 'login failed',
        });
        return res.status(200).json({
          success: false,
          sql,
          rows,
          status,
          message: 'Invalid credentials',
        });
      }
    } catch (err) {
      addLog({
        mode,
        username,
        sql,
        status: 'error',
        outcome: 'sql error',
      });
      return res.status(200).json({
        success: false,
        sql,
        rows: [],
        status: 'error',
        message: err.message,
      });
    }
  }
});

// GET /api/products?category=...&mode=...
app.get('/api/products', async (req, res) => {
  const category = typeof req.query.category === 'string' ? req.query.category : 'Gifts';
  const mode = req.query.mode === 'secure' ? 'secure' : 'vulnerable';

  const hasInjectionChars =
    category.includes("'") ||
    category.includes('--');

  if (mode === 'vulnerable') {
    // SAFETY GUARD (vulnerable mode only): block stacked queries like "; DROP TABLE products"
    if (category.includes(';')) {
      return res.status(200).json({
        success: false,
        sql: '',
        rows: [],
        status: 'error',
        message: 'Multiple statements are not allowed in this lab.',
      });
    }

    // Vulnerable SQL implementation: category input is joined directly into the query
    const sql = `SELECT * FROM products WHERE category = '${category}' AND released = 1`;

    try {
      const result = await db.query(sql);
      const rows = result.rows || [];

      // Check if unreleased products were exposed due to injection (released = 0)
      const unreleasedCount = rows.filter((r) => r.released == 0 || r.released === false).length;
      const solved = unreleasedCount > 0;
      let status = 'normal';
      let outcome = 'query ok';
      let message = `Loaded ${rows.length} product(s) in category '${category}'.`;

      if (unreleasedCount > 0) {
        status = 'vulnerable-bypass';
        outcome = 'injection revealed unreleased';
        message = `SQL injection successful: ${unreleasedCount} hidden/unreleased product(s) revealed!`;
      } else if (hasInjectionChars && rows.length > 0) {
        status = 'vulnerable-bypass';
        outcome = 'query altered';
        message = `SQL query altered by input syntax.`;
      }

      return res.status(200).json({
        success: true,
        sql,
        rows,
        status,
        message,
        unreleasedCount,
        solved,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        sql,
        rows: [],
        status: 'error',
        message: err.message,
        solved: false,
      });
    }
  } else {
    // SECURE MODE: Parameterized query ($1)
    const sql = 'SELECT * FROM products WHERE category = $1 AND released = 1';

    try {
      const result = await db.query(sql, [category]);
      const rows = result.rows || [];

      const status = hasInjectionChars && rows.length === 0 ? 'blocked' : 'normal';
      const outcome = status === 'blocked' ? 'attack blocked' : 'query ok';
      const message = status === 'blocked'
        ? "In Secure mode your input is sent to the database as data ($1), not as SQL, so quotes and comments had no special meaning."
        : `Loaded ${rows.length} product(s) in category '${category}'.`;

      return res.status(200).json({
        success: true,
        sql,
        rows,
        status,
        message,
        unreleasedCount: 0,
        solved: false,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        sql,
        rows: [],
        status: 'error',
        message: err.message,
        solved: false,
      });
    }
  }
});

// GET /api/logs
app.get('/api/logs', (req, res) => {
  res.json(logs);
});

// POST /api/reset
app.post('/api/reset', async (req, res) => {
  try {
    await db.seed();
    logs = [];
    res.json({
      message: 'Lab reset',
    });
  } catch (err) {
    res.status(500).json({
      error: `Failed to reset lab: ${err.message}`,
    });
  }
});

// Server startup with database connection retry
async function startServer() {
  try {
    console.log('Connecting to database with retry...');
    await db.connectWithRetry();

    app.listen(PORT, HOST, () => {
      console.log(`Server listening on http://${HOST}:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server due to database connection error:', err.message);
    process.exit(1);
  }
}

startServer();

module.exports = app;
