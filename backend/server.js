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
