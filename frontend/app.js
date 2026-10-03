/**
 * SQL Injection Lab: Login - Main Client Controller
 *
 * This script controls:
 * 1. Mode switching between Vulnerable and Secure representations.
 * 2. Communication with the real lab backend API endpoints.
 * 3. Sanitized HTML rendering of executed SQL queries with exact user input highlighted.
 * 4. Structured authentication result display with security badges and educational explanations.
 * 5. Event dispatching ('lab:result' and 'lab:reset') for modular teammate integration.
 */

// DOM Element references
const modeStrip = document.getElementById('mode-strip');
const modeStripLabel = document.getElementById('mode-strip-label');
const modeStripDesc = document.getElementById('mode-strip-desc');
const modeVulnerableRadio = document.getElementById('mode-vulnerable');
const modeSecureRadio = document.getElementById('mode-secure');

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btn-login');
const btnReset = document.getElementById('btn-reset');
const resetErrorEl = document.getElementById('reset-error');
const exampleButtons = document.querySelectorAll('.btn-example');

const resultBox = document.getElementById('result-box');
const sqlDisplay = document.getElementById('sql-display');

/**
 * HTML sanitization helper to prevent XSS (Cross-Site Scripting).
 * Viva explanation:
 * Any user input injected into innerHTML must be encoded so that characters
 * like <, >, &, ", and ' are not interpreted by the browser as HTML tags.
 *
 * @param {string} str - Raw string to escape
 * @returns {string} - Escaped string safe for innerHTML
 */
function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Returns the currently active mode ("vulnerable" or "secure")
 */
function getSelectedMode() {
  return modeSecureRadio.checked ? 'secure' : 'vulnerable';
}

/**
 * Updates the top coloured strip and UI elements when the mode changes.
 * Viva explanation:
 * - Amber for Vulnerable: dynamic SQL concatenation can allow query manipulation.
 * - Teal for Secure: parameterized SQL separates code execution from untrusted data.
 *
 * @param {string} mode - "vulnerable" or "secure"
 */
function updateModeUI(mode) {
  if (mode === 'vulnerable') {
    modeStrip.className = 'mode-strip mode-vulnerable';
    modeStripLabel.textContent = 'Vulnerable mode';
    modeStripDesc.textContent = 'The server builds the SQL by joining your text into it.';
  } else {
    modeStrip.className = 'mode-strip mode-secure';
    modeStripLabel.textContent = 'Secure mode';
    modeStripDesc.textContent = 'The server sends your text as data, separate from the SQL.';
  }
}

/**
 * Generates student-friendly explanation based on response status and SQL.
 *
 * @param {string} status - Response status
 * @param {string} sql - SQL query returned from backend
 * @returns {string} - Pedagogical explanation for students
 */
function getStatusExplanation(status, sql) {
  if (status === 'vulnerable-bypass') {
    return "Your input changed the logic of the SQL query, so the database returned rows without a valid password. The quote (') closed the text early and -- turned the rest of the query into a comment.";
  }
  if (status === 'blocked') {
    return "In Secure mode your input is sent to the database as data ($1, $2), not as SQL, so the quote and -- characters had no special meaning and the login failed.";
  }
  if (status === 'error') {
    if (sql && typeof sql === 'string' && sql.trim() !== '') {
      return "Your input broke the SQL syntax and the database rejected the query.";
    } else {
      return "The lab's safety guard blocked this input before it reached the database (semicolons are not allowed).";
    }
  }
  return '';
}

/**
 * Renders the SQL query in the dark code box.
 * Viva explanation:
 * - In Vulnerable mode, the user input is concatenated directly. We wrap the exact
 *   typed input in <mark class="mark-vuln"> to demonstrate how attacker input
 *   becomes part of the executable SQL grammar (e.g. quotes closing literals, -- commenting).
 * - In Secure mode, the query uses fixed placeholders ($1, $2). The user text is
 *   transmitted in a separate parameter stream, shown below the query.
 *
 * @param {string} mode - "vulnerable" or "secure"
 * @param {string} username - User typed username
 * @param {string} password - User typed password
 * @param {string} sql - SQL string returned from the server
 */
function renderSqlDisplay(mode, username, password, sql) {
  // If data.sql is empty: show blocked safety guard notice
  if (!sql || typeof sql !== 'string' || sql.trim() === '') {
    sqlDisplay.innerHTML = `<span class="sql-placeholder">Query not run: blocked by the lab's safety guard.</span>`;
    return;
  }

  const safeUser = escapeHtml(username);
  const safePass = escapeHtml(password);

  if (mode === 'vulnerable') {
    const expectedPattern = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'";
    if (sql === expectedPattern) {
      sqlDisplay.innerHTML = `<code><span class="sql-keyword">SELECT</span> * <span class="sql-keyword">FROM</span> users <span class="sql-keyword">WHERE</span> username='<mark class="mark-vuln">${safeUser}</mark>' <span class="sql-keyword">AND</span> password='<mark class="mark-vuln">${safePass}</mark>'</code>`;
    } else {
      // If returned SQL does not match expected pattern, show plain without highlighting
      sqlDisplay.innerHTML = `<code>${escapeHtml(sql)}</code>`;
    }
  } else {
    sqlDisplay.innerHTML = `<code><span class="sql-keyword">SELECT</span> * <span class="sql-keyword">FROM</span> users <span class="sql-keyword">WHERE</span> username=$1 <span class="sql-keyword">AND</span> password=$2</code>` +
      `<div class="sql-params-note">` +
      `Sent separately as data: $1 = <mark class="mark-sec">${safeUser}</mark>, $2 = <mark class="mark-sec">${safePass}</mark>` +
      `</div>`;
  }
}

/**
 * Badge configuration for the 4 distinct lab states.
 * Viva explanation:
 * - vulnerable-bypass (Red): Injection succeeded; attacker altered query structure.
 * - blocked (Teal): Parameterization preserved security; input treated as literal string.
 * - error (Amber): Malformed SQL syntax generated by unbalanced quote or safety block.
 * - normal (Grey): Standard legitimate authentication check succeeded or failed normally.
 */
const BADGE_MAP = {
  'vulnerable-bypass': {
    text: 'Injection worked: your text changed the query',
    className: 'badge-bypass'
  },
  'blocked': {
    text: 'Input treated as plain text',
    className: 'badge-blocked'
  },
  'error': {
    text: 'The database rejected the query',
    className: 'badge-error'
  },
  'normal': {
    text: 'Normal behaviour',
    className: 'badge-normal'
  }
};

/**
 * Renders the authentication outcome inside the Result card.
 *
 * @param {Object} response - The API response object
 * @param {boolean} response.success - Whether authentication was granted
 * @param {string} response.message - Explanatory message
 * @param {string} response.status - Status code ("vulnerable-bypass", "blocked", "error", "normal")
 * @param {Array} response.rows - Returned database records
 * @param {string} response.sql - Executed SQL string
 */
function renderResultBox(response) {
  const isSuccess = Boolean(response.success);
  const status = response.status || 'normal';
  const badgeInfo = BADGE_MAP[status] || BADGE_MAP['normal'];

  // Determine headline
  const headlineText = isSuccess ? 'Login successful' : 'Login failed';
  const headlineClass = isSuccess ? 'success' : (status === 'error' ? 'error' : 'failed');

  // Format who is logged in
  const rows = Array.isArray(response.rows) ? response.rows : [];
  const rowCount = rows.length;

  let loggedInText = 'None (unauthenticated)';
  if (rows.length > 0) {
    loggedInText = rows.map((r) => `${escapeHtml(r.username)} (${escapeHtml(r.role)})`).join(', ');
  }

  // Student explanation
  const explanation = getStatusExplanation(status, response.sql);

  resultBox.innerHTML = `
    <div class="result-content">
      <div class="result-header-row">
        <h3 class="result-headline ${headlineClass}">${escapeHtml(headlineText)}</h3>
        <span class="badge ${badgeInfo.className}">${escapeHtml(badgeInfo.text)}</span>
      </div>

      <p class="result-message">${escapeHtml(response.message || '')}</p>
      ${explanation ? `<p class="result-explanation">${escapeHtml(explanation)}</p>` : ''}

      <div class="result-details-grid">
        <span class="result-label">Logged in as:</span>
        <span class="result-value">${loggedInText}</span>

        <span class="result-label">Rows returned:</span>
        <span class="result-value">${rowCount} ${rowCount === 1 ? 'row' : 'rows'}</span>
      </div>
    </div>
  `;
}

/**
 * Displays a helpful network error state when the backend server is unreachable.
 */
function renderNetworkError() {
  resultBox.innerHTML = `
    <div class="network-error-card">
      <div class="result-header-row">
        <h3 class="result-headline failed">Cannot reach the lab server</h3>
        <span class="badge badge-error">Offline</span>
      </div>
      <p class="result-message">Cannot reach the lab server. Check that Docker is running: docker compose up --build</p>
    </div>
  `;

  sqlDisplay.innerHTML = `<span class="sql-placeholder">-- Query failed to reach database</span>`;
}

/**
 * Displays error message near reset button without clearing screen.
 *
 * @param {string} message - Error description
 */
function showResetError(message) {
  if (resetErrorEl) {
    resetErrorEl.textContent = message;
    resetErrorEl.style.display = 'block';
  }
}

/**
 * Clears any reset error message.
 */
function clearResetError() {
  if (resetErrorEl) {
    resetErrorEl.textContent = '';
    resetErrorEl.style.display = 'none';
  }
}

/**
 * Resets the output cards to their clean default state.
 */
function clearOutputs() {
  resultBox.innerHTML = `<div class="result-empty">Submit credentials to see query execution and authentication results.</div>`;
  sqlDisplay.innerHTML = `<span class="sql-placeholder">-- No query executed yet</span>`;
}

/**
 * Submits login request to real backend API.
 *
 * @param {string} username - User input username
 * @param {string} password - User input password
 * @param {string} mode - "vulnerable" or "secure"
 */
async function handleLogin(username, password, mode) {
  clearResetError();

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, mode })
    });

    // The backend sends { success, sql, rows, status, message } even on HTTP 400
    const responseData = await response.json();

    // Render result card and SQL code box
    renderResultBox(responseData);
    renderSqlDisplay(mode, username, password, responseData.sql);

    // Dispatch custom event for teammate extensions (Query visualizer & Activity log)
    // Viva explanation: CustomEvent decouples components, allowing teammates to add
    // live telemetry or AST query visualization without modifying this file.
    document.dispatchEvent(
      new CustomEvent('lab:result', {
        detail: {
          time: new Date().toISOString(),
          mode,
          username,
          password,
          ...responseData
        }
      })
    );
  } catch (err) {
    console.error('Login request failed:', err);
    renderNetworkError();
  }
}

/**
 * Resets lab state by calling backend /api/reset endpoint.
 */
async function handleReset() {
  clearResetError();

  try {
    const response = await fetch('/api/reset', {
      method: 'POST'
    });

    if (!response.ok) {
      let errorMessage = 'Failed to reset lab';
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) {
          errorMessage = errJson.error;
        }
      } catch {
        errorMessage = 'Failed to reset lab: HTTP ' + response.status;
      }
      showResetError(errorMessage);
      return; // Do not clear the screen on reset failure
    }

    // Reset succeeded: clear inputs and reset outputs
    loginForm.reset();
    modeVulnerableRadio.checked = true;
    updateModeUI('vulnerable');
    clearOutputs();

    // Dispatch custom reset event for teammate extensions
    document.dispatchEvent(new CustomEvent('lab:reset'));
  } catch (err) {
    console.error('Reset request failed:', err);
    showResetError('Cannot reach the lab server. Check that Docker is running: docker compose up --build');
  }
}

// Event Listeners
modeVulnerableRadio.addEventListener('change', () => updateModeUI('vulnerable'));
modeSecureRadio.addEventListener('change', () => updateModeUI('secure'));

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const username = usernameInput.value;
  const password = passwordInput.value;
  const mode = getSelectedMode();
  handleLogin(username, password, mode);
});

btnReset.addEventListener('click', handleReset);

// Example input buttons handler
exampleButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const user = btn.getAttribute('data-user') || '';
    const pass = btn.getAttribute('data-pass') || '';

    usernameInput.value = user;
    passwordInput.value = pass;
    usernameInput.focus();
  });
});

// Initial setup on page load
updateModeUI(getSelectedMode());

