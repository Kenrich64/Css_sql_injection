/**
 * SQL Injection Lab: Login - Fake Backend API
 *
 * This file serves as an in-browser mock backend so students can practice
 * SQL injection and parameterized query concepts immediately without
 * running a separate backend server.
 *
 * Viva explanation:
 * - In Vulnerable Mode: The server joins (concatenates) user inputs directly
 *   into the SQL query string. Quotes (') break out of the string literal,
 *   and comment characters (--) tell SQL to ignore whatever comes after.
 * - In Secure Mode: The server uses parameterized queries ($1, $2).
 *   The SQL syntax is fixed in advance, and inputs are passed strictly as data,
 *   preventing any attacker text from altering query logic.
 */

// Dummy database table for users
const MOCK_USERS = [
  { id: 1, username: 'admin', password: 'Adm!n@123', role: 'admin' },
  { id: 2, username: 'student1', password: 'pass123', role: 'student' },
  { id: 3, username: 'student2', password: 'pass456', role: 'student' }
];

/**
 * Simulates POST /api/login
 * @param {string} username - Username typed by the student
 * @param {string} password - Password typed by the student
 * @param {string} mode - "vulnerable" or "secure"
 * @returns {Promise<{success: boolean, sql: string, rows: Array, status: string, message: string}>}
 */
async function fakeLogin(username, password, mode) {
  const u = username != null ? String(username) : '';
  const p = password != null ? String(password) : '';

  // Helper to remove sensitive password field from returned database rows
  const sanitizeRows = (rows) =>
    rows.map((user) => ({
      id: user.id,
      username: user.username,
      role: user.role
    }));

  if (mode === 'vulnerable') {
    // Construct SQL by string concatenation (Vulnerable pattern)
    const sql = "SELECT * FROM users WHERE username='" + u + "' AND password='" + p + "'";

    // 1. Check for Tautology Injection (e.g. ' OR 1=1 or ' OR 1=1--)
    // ' OR 1=1 evaluates to true for all rows in the users table.
    if (/'\s*OR\s*1\s*=\s*1/i.test(u)) {
      return {
        success: true,
        sql,
        rows: sanitizeRows(MOCK_USERS),
        status: 'vulnerable-bypass',
        message: "SQL injection successful: tautology ' OR 1=1 evaluated to TRUE, returning all user records."
      };
    }

    // 2. Check for Comment Truncation (e.g. name'--)
    // The single quote closes the username literal, and '--' comments out the remainder of the query (the password check).
    if (u.includes("'--")) {
      const targetName = u.split("'--")[0].trim();
      const matchedUser = MOCK_USERS.find(
        (usr) => usr.username.toLowerCase() === targetName.toLowerCase()
      );

      if (matchedUser) {
        return {
          success: true,
          sql,
          rows: sanitizeRows([matchedUser]),
          status: 'vulnerable-bypass',
          message: `SQL injection successful: comment syntax (-- ) truncated the password check for user '${matchedUser.username}'.`
        };
      } else {
        return {
          success: false,
          sql,
          rows: [],
          status: 'vulnerable-bypass',
          message: `Password check bypassed with comment syntax, but user '${targetName}' was not found in the database.`
        };
      }
    }

    // 3. Check for a lone unclosed quote or syntax break
    // In real SQL engines, an unbalanced single quote causes a syntax parsing error.
    if (u.includes("'") || p.includes("'")) {
      return {
        success: false,
        sql,
        rows: [],
        status: 'error',
        message: 'SQL error: syntax error near the quote you typed'
      };
    }

    // 4. Normal authentication check (exact match)
    const authenticatedUser = MOCK_USERS.find(
      (usr) => usr.username === u && usr.password === p
    );

    if (authenticatedUser) {
      return {
        success: true,
        sql,
        rows: sanitizeRows([authenticatedUser]),
        status: 'normal',
        message: 'Login successful. Authenticated using standard credentials.'
      };
    } else {
      return {
        success: false,
        sql,
        rows: [],
        status: 'normal',
        message: 'Login failed. Invalid username or password.'
      };
    }
  } else {
    // Secure mode: Parameterized SQL query ($1 and $2 placeholders)
    const sql = 'SELECT * FROM users WHERE username=$1 AND password=$2';

    // In parameterized queries, database drivers never parse parameters as SQL syntax.
    const authenticatedUser = MOCK_USERS.find(
      (usr) => usr.username === u && usr.password === p
    );

    if (authenticatedUser) {
      return {
        success: true,
        sql,
        rows: sanitizeRows([authenticatedUser]),
        status: 'normal',
        message: 'Login successful. Parameterized query safely verified credentials.'
      };
    }

    // If login failed, inspect if injection syntax was attempted
    const attemptedInjection = u.includes("'") || u.includes('--') || p.includes("'") || p.includes('--');

    if (attemptedInjection) {
      return {
        success: false,
        sql,
        rows: [],
        status: 'blocked',
        message: 'Login failed. Input characters like quotes and comments were treated strictly as plain literal text.'
      };
    }

    return {
      success: false,
      sql,
      rows: [],
      status: 'normal',
      message: 'Login failed. Invalid username or password.'
    };
  }
}

/**
 * Simulates POST /api/reset
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function fakeReset() {
  return {
    success: true,
    message: 'Lab data reset to default.'
  };
}

// Export for Node.js environments (tests / teammate tooling)
if (typeof module !== 'undefined') {
  module.exports = { fakeLogin, fakeReset };
}

// Expose on global window object for browser scripts
if (typeof window !== 'undefined') {
  window.fakeLogin = fakeLogin;
  window.fakeReset = fakeReset;
}
