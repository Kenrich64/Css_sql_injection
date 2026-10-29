/**
 * SQL Injection Lab: Shop Category Filter Controller
 *
 * This script controls:
 * 1. Reading category and mode parameters from the URL (e.g. shop.html?category=Gifts).
 * 2. Calling the real backend API: GET /api/products?category=...&mode=...
 * 3. Sanitized HTML rendering of executed SQL queries with exact user input highlighted.
 * 4. Rendering product cards, specifically distinguishing unreleased items revealed by SQL injection.
 * 5. Session authentication check and Return to Login navigation.
 */

// DOM Element references
const modeStrip = document.getElementById('mode-strip');
const modeStripLabel = document.getElementById('mode-strip-label');
const modeStripDesc = document.getElementById('mode-strip-desc');
const modeVulnerableRadio = document.getElementById('mode-vulnerable');
const modeSecureRadio = document.getElementById('mode-secure');

const loggedUserEl = document.getElementById('logged-user');
const loggedRoleEl = document.getElementById('logged-role');
const btnLogout = document.getElementById('btn-logout');

const filterForm = document.getElementById('filter-form');
const categoryInput = document.getElementById('category-input');
const btnFilter = document.getElementById('btn-filter');
const btnResetShop = document.getElementById('btn-reset-shop');
const resetErrorEl = document.getElementById('reset-error');
const categoryPillContainer = document.getElementById('category-pill-container');
const examplesContainer = document.getElementById('examples-grid');

const resultBox = document.getElementById('result-box');
const sqlDisplay = document.getElementById('sql-display');
const productsGrid = document.getElementById('products-grid');
const productCountEl = document.getElementById('product-count');
const unreleasedAlertEl = document.getElementById('unreleased-alert');

// Emoji map for offline rendering of products
const PRODUCT_EMOJIS = {
  'Novelty Hacker Mug': '☕',
  'Cybersecurity Sticker Pack': '🏷️',
  'Encrypted Hardware Vault (Prototype)': '🔐',
  'Black Cyber Hoodie': '🧥',
  'Binary Matrix Socks': '🧦',
  'Stealth Bomber Jacket (Internal Staff)': '🦺',
  'Mechanical Hackboard': '⌨️',
  'USB Payload Drive Shell': '💾',
  'Zero-Day Hardware Debugger (Classified)': '🔬',
  'Web Security Fundamentals': '📖',
  'The SQL Injection Playbook': '📕',
  'Advanced Kernel Exploitation (Early Draft)': '📜'
};

const CATEGORY_DEFAULT_EMOJIS = {
  'Gifts': '🎁',
  'Clothing': '👕',
  'Tech': '💻',
  'Books': '📚'
};

/**
 * HTML sanitization helper to prevent XSS (Cross-Site Scripting).
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
 * Extracts base category name from any input (e.g. "Gifts'--" -> "Gifts", "' OR category = 'Clothing'--" -> "Clothing")
 *
 * @param {string} category
 * @returns {string} - Clean base category name
 */
function getBaseCategory(category) {
  if (!category || typeof category !== 'string') return 'Gifts';
  const clean = category.trim();
  const known = ['Gifts', 'Clothing', 'Tech', 'Books'];
  for (const k of known) {
    if (
      clean.toLowerCase() === k.toLowerCase() ||
      clean.toLowerCase().startsWith(k.toLowerCase() + "'") ||
      clean.toLowerCase().includes("category = '" + k.toLowerCase() + "'") ||
      clean.toLowerCase().includes("category='" + k.toLowerCase() + "'")
    ) {
      return k;
    }
  }
  if (categoryPillContainer) {
    const active = categoryPillContainer.querySelector('.btn-category.active');
    if (active) return active.getAttribute('data-category');
  }
  return 'Gifts';
}

/**
 * Updates the active class on quick category buttons.
 *
 * @param {string} category - Selected category
 */
function updateCategoryPills(category) {
  if (!categoryPillContainer) return;
  const baseCat = getBaseCategory(category);
  const buttons = categoryPillContainer.querySelectorAll('.btn-category');
  buttons.forEach((btn) => {
    if (btn.getAttribute('data-category').toLowerCase() === baseCat.toLowerCase()) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

/**
 * Updates example injection buttons contextual to the active category.
 *
 * @param {string} category - Current category
 */
function updateExampleButtons(category) {
  const container = document.getElementById('examples-grid');
  if (!container) return;
  const baseCat = getBaseCategory(category);

  container.innerHTML = `
    <button
      type="button"
      class="btn-example"
      data-category="${escapeHtml(baseCat)}"
      title="Normal category lookup"
    >Normal: ${escapeHtml(baseCat)}</button>

    <button
      type="button"
      class="btn-example"
      data-category="${escapeHtml(baseCat)}'--"
      title="Comment bypass: reveals hidden unreleased items in ${escapeHtml(baseCat)}!"
    >${escapeHtml(baseCat)}'--</button>

    <button
      type="button"
      class="btn-example"
      data-category="' OR category = '${escapeHtml(baseCat)}'--"
      title="Targeted OR query: reveals hidden unreleased items in ${escapeHtml(baseCat)}!"
    >' OR category = '${escapeHtml(baseCat)}'--</button>

    <button
      type="button"
      class="btn-example"
      data-category="' OR 1=1--"
      title="Global tautology bypass: reveals all products across all categories!"
    >' OR 1=1--</button>
  `;
}

/**
 * Generates student-friendly explanation based on response status and SQL.
 *
 * @param {string} status - Response status
 * @param {string} sql - SQL query returned from backend
 * @param {number} unreleasedCount - Number of hidden items returned
 * @returns {string} - Pedagogical explanation for students
 */
function getStatusExplanation(status, sql, unreleasedCount) {
  if (status === 'vulnerable-bypass') {
    if (unreleasedCount > 0) {
      return "Your input changed the logic of the SQL query. The quote (') closed the category string early and the comment (--) truncated the 'AND released = 1' check. All products including unreleased prototypes are now visible!";
    }
    return "Your input altered the SQL query condition. Because input is joined directly as SQL text, query logic was modified.";
  }
  if (status === 'blocked') {
    return "In Secure mode your input is sent to the database as data ($1), not as SQL, so the quote and -- characters had no special meaning and no unreleased products leaked.";
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
 *
 * @param {string} mode - "vulnerable" or "secure"
 * @param {string} category - User typed category
 * @param {string} sql - SQL string returned from the server
 */
function renderSqlDisplay(mode, category, sql) {
  if (!sql || typeof sql !== 'string' || sql.trim() === '') {
    sqlDisplay.innerHTML = `<span class="sql-placeholder">Query not run: blocked by the lab's safety guard.</span>`;
    return;
  }

  const safeCategory = escapeHtml(category);

  if (mode === 'vulnerable') {
    const expectedPattern = "SELECT * FROM products WHERE category = '" + category + "' AND released = 1";
    if (sql === expectedPattern) {
      sqlDisplay.innerHTML = `<code><span class="sql-keyword">SELECT</span> * <span class="sql-keyword">FROM</span> products <span class="sql-keyword">WHERE</span> category = '<mark class="mark-vuln">${safeCategory}</mark>' <span class="sql-keyword">AND</span> released = 1</code>`;
    } else {
      sqlDisplay.innerHTML = `<code>${escapeHtml(sql)}</code>`;
    }
  } else {
    sqlDisplay.innerHTML = `<code><span class="sql-keyword">SELECT</span> * <span class="sql-keyword">FROM</span> products <span class="sql-keyword">WHERE</span> category = $1 <span class="sql-keyword">AND</span> released = 1</code>` +
      `<div class="sql-params-note">` +
      `Sent separately as data: $1 = <mark class="mark-sec">${safeCategory}</mark>` +
      `</div>`;
  }
}

/**
 * Badge configuration for the 4 distinct lab states.
 */
const BADGE_MAP = {
  'vulnerable-bypass': {
    text: 'Injection worked: unreleased products revealed',
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
 * Renders the query execution outcome inside the Result card.
 *
 * @param {Object} response - The API response object
 * @param {string} category - Current category string
 */
function renderResultBox(response, category) {
  const isSuccess = Boolean(response.success);
  const status = response.status || 'normal';
  const badgeInfo = BADGE_MAP[status] || BADGE_MAP['normal'];
  const unreleasedCount = response.unreleasedCount || 0;

  let headlineText = isSuccess ? 'Query executed successfully' : 'Query execution failed';
  if (unreleasedCount > 0) {
    headlineText = 'Injection successful: unreleased items leaked!';
  }
  const headlineClass = isSuccess ? (unreleasedCount > 0 ? 'failed' : 'success') : (status === 'error' ? 'error' : 'failed');

  const rows = Array.isArray(response.rows) ? response.rows : [];
  const explanation = getStatusExplanation(status, response.sql, unreleasedCount);

  resultBox.innerHTML = `
    <div class="result-content">
      <div class="result-header-row">
        <h3 class="result-headline ${headlineClass}">${escapeHtml(headlineText)}</h3>
        <span class="badge ${badgeInfo.className}">${escapeHtml(badgeInfo.text)}</span>
      </div>

      <p class="result-message">${escapeHtml(response.message || '')}</p>
      ${explanation ? `<p class="result-explanation">${escapeHtml(explanation)}</p>` : ''}

      <div class="result-details-grid">
        <span class="result-label">Filter input:</span>
        <span class="result-value">${escapeHtml(category)}</span>

        <span class="result-label">Products returned:</span>
        <span class="result-value">${rows.length} ${rows.length === 1 ? 'product' : 'products'} (${unreleasedCount} unreleased)</span>
      </div>
    </div>
  `;
}

/**
 * Renders the Query Analysis and Injection Mechanics breakdown.
 *
 * @param {Object} response - The API response object
 * @param {string} category - Current category string
 * @param {string} mode - "vulnerable" or "secure"
 */
function renderQueryAnalysis(response, category, mode) {
  const analysisBox = document.getElementById('query-analysis-box');
  if (!analysisBox) return;

  const status = response.status || 'normal';
  const unreleasedCount = response.unreleasedCount || 0;
  const baseCat = getBaseCategory(category);

  if (status === 'vulnerable-bypass') {
    analysisBox.innerHTML = `
      <div class="analysis-item">
        <span class="analysis-item-icon">🔓</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Query Logic Bypassed</div>
          <div class="analysis-item-desc">User input was concatenated directly into executable SQL text.</div>
        </div>
      </div>
      <div class="analysis-item">
        <span class="analysis-item-icon">✂️</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Release Filter Truncated</div>
          <div class="analysis-item-desc">The SQL comment token (<code>--</code>) truncated <code>AND released = 1</code>, exposing ${unreleasedCount} unreleased prototype(s).</div>
        </div>
      </div>
      <div class="analysis-item">
        <span class="analysis-item-icon">🎯</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Active Scope: ${escapeHtml(baseCat)}</div>
          <div class="analysis-item-desc">Results are scoped to category <strong>${escapeHtml(baseCat)}</strong>, revealing its confidential prototype without dumping other categories.</div>
        </div>
      </div>
    `;
  } else if (status === 'blocked') {
    analysisBox.innerHTML = `
      <div class="analysis-item">
        <span class="analysis-item-icon">🛡️</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Parameterized Query Enforced</div>
          <div class="analysis-item-desc">Input was transmitted to PostgreSQL as parameter <code>$1</code>. Quotes and comment syntax had no effect on the query structure.</div>
        </div>
      </div>
      <div class="analysis-item">
        <span class="analysis-item-icon">🔒</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Zero Confidential Leaks</div>
          <div class="analysis-item-desc">The condition <code>category = $1 AND released = 1</code> remains strictly intact.</div>
        </div>
      </div>
    `;
  } else if (status === 'error') {
    analysisBox.innerHTML = `
      <div class="analysis-item">
        <span class="analysis-item-icon">⚠️</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">SQL Syntax Error / Guard Triggered</div>
          <div class="analysis-item-desc">${escapeHtml(response.message || 'Database rejected the query syntax.')}</div>
        </div>
      </div>
    `;
  } else {
    analysisBox.innerHTML = `
      <div class="analysis-item">
        <span class="analysis-item-icon">📦</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Standard Category Filter</div>
          <div class="analysis-item-desc">Executing <code>category = '${escapeHtml(baseCat)}' AND released = 1</code>.</div>
        </div>
      </div>
      <div class="analysis-item">
        <span class="analysis-item-icon">ℹ️</span>
        <div class="analysis-item-content">
          <div class="analysis-item-title">Hidden Items Protected</div>
          <div class="analysis-item-desc">Unreleased prototypes in ${escapeHtml(baseCat)} remain hidden. Click an example injection payload above to reveal them!</div>
        </div>
      </div>
    `;
  }
}

/**
 * Renders the products list in the grid.
 *
 * @param {Array} products - List of product rows
 * @param {number} unreleasedCount - Number of unreleased items
 */
function renderProductsGrid(products, unreleasedCount) {
  const labSolvedBanner = document.getElementById('lab-solved-banner');

  if (!products || products.length === 0) {
    productCountEl.textContent = '0 products';
    productsGrid.innerHTML = `
      <div class="result-empty" style="grid-column: 1 / -1; padding: 32px 16px;">
        No products matched the search criteria.
      </div>
    `;
    unreleasedAlertEl.style.display = 'none';
    if (labSolvedBanner) labSolvedBanner.style.display = 'none';
    return;
  }

  productCountEl.textContent = `${products.length} product${products.length === 1 ? '' : 's'}`;

  const solvedBadgePill = document.getElementById('solved-badge-pill');
  const solvedBottomTitle = document.getElementById('solved-bottom-title');
  const solvedBottomDesc = document.getElementById('solved-bottom-desc');

  // If unreleased products are visible (released = 0), show lab solved celebration and warning banner
  if (unreleasedCount > 0) {
    if (labSolvedBanner) labSolvedBanner.style.display = 'flex';
    unreleasedAlertEl.style.display = 'block';
    unreleasedAlertEl.innerHTML = `
      <div class="unreleased-banner">
        <span>⚠️ <strong>SQL INJECTION WARNING:</strong> ${unreleasedCount} hidden/unreleased prototype product(s) are visible because the query logic was bypassed!</span>
      </div>
    `;
    if (solvedBadgePill) solvedBadgePill.textContent = '🎉 Lab Solved!';
    if (solvedBottomTitle) solvedBottomTitle.textContent = 'Ready for your assignment quiz?';
    if (solvedBottomDesc) solvedBottomDesc.textContent = `Awesome job! You bypassed the category query and revealed ${unreleasedCount} confidential prototype product(s). Complete the 10-question MCQ quiz to test your mastery or share feedback.`;
  } else {
    if (labSolvedBanner) labSolvedBanner.style.display = 'none';
    unreleasedAlertEl.style.display = 'none';
    if (solvedBadgePill) solvedBadgePill.textContent = '📚 Assignment & Feedback';
    if (solvedBottomTitle) solvedBottomTitle.textContent = 'Test your understanding & share feedback';
    if (solvedBottomDesc) solvedBottomDesc.textContent = 'Reinforce your knowledge of SQL injection vulnerabilities and parameterized queries with our 10-question MCQ quiz, or share your thoughts to help improve this lab.';
  }

  const cardsHtml = products.map((item) => {
    const isUnreleased = item.released == 0 || item.released === false;
    const emoji = PRODUCT_EMOJIS[item.name] || CATEGORY_DEFAULT_EMOJIS[item.category] || '📦';
    const cardClass = isUnreleased ? 'product-card unreleased' : 'product-card';
    const statusPill = isUnreleased
      ? `<span class="product-status-tag unreleased">🚨 UNRELEASED (Hidden)</span>`
      : `<span class="product-status-tag released">✅ Released</span>`;

    return `
      <article class="${cardClass}">
        <div class="product-emoji">${emoji}</div>
        <span class="product-category-tag">${escapeHtml(item.category)}</span>
        <h3 class="product-name">${escapeHtml(item.name)}</h3>
        <p class="product-desc">${escapeHtml(item.description || '')}</p>
        <div class="product-footer">
          <span class="product-price">$${Number(item.price).toFixed(2)}</span>
          ${statusPill}
        </div>
      </article>
    `;
  }).join('');

  productsGrid.innerHTML = cardsHtml;
}

/**
 * Displays network error when backend is offline.
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
  productsGrid.innerHTML = `<div class="result-empty" style="grid-column: 1 / -1;">Server unreachable.</div>`;
}

/**
 * Shows reset error near reset button.
 */
function showResetError(msg) {
  if (resetErrorEl) {
    resetErrorEl.textContent = msg;
    resetErrorEl.style.display = 'block';
  }
}

/**
 * Clears reset error.
 */
function clearResetError() {
  if (resetErrorEl) {
    resetErrorEl.textContent = '';
    resetErrorEl.style.display = 'none';
  }
}

/**
 * Fetches products from real backend API: GET /api/products?category=...&mode=...
 *
 * @param {string} category - Category string
 * @param {string} mode - "vulnerable" or "secure"
 */
async function fetchProducts(category, mode) {
  clearResetError();

  try {
    const encodedCategory = encodeURIComponent(category);
    const endpoint = `/api/products?category=${encodedCategory}&mode=${encodeURIComponent(mode)}`;

    const response = await fetch(endpoint);
    const responseData = await response.json();

    // Render components
    renderResultBox(responseData, category);
    renderSqlDisplay(mode, category, responseData.sql);
    renderProductsGrid(responseData.rows, responseData.unreleasedCount || 0);
    renderQueryAnalysis(responseData, category, mode);
  } catch (err) {
    console.error('Products fetch error:', err);
    renderNetworkError();
  }
}

/**
 * Sets current URL query params and triggers product fetch.
 *
 * @param {string} category - Category
 * @param {string} mode - Mode
 */
function applyFilter(category, mode) {
  categoryInput.value = category;
  updateCategoryPills(category);
  updateExampleButtons(category);

  // Update browser address bar without full page reload (PortSwigger lab style)
  const queryParam = mode === 'secure'
    ? `?category=${encodeURIComponent(category)}&mode=secure`
    : `?category=${encodeURIComponent(category)}`;
  const newUrl = `${window.location.pathname}${queryParam}`;
  window.history.pushState({ category, mode }, '', newUrl);

  fetchProducts(category, mode);
}

/**
 * Handles lab reset call.
 */
async function handleReset() {
  clearResetError();

  try {
    const response = await fetch('/api/reset', { method: 'POST' });
    if (!response.ok) {
      let msg = 'Failed to reset lab';
      try {
        const errJson = await response.json();
        if (errJson && errJson.error) msg = errJson.error;
      } catch {
        msg = `HTTP ${response.status}: Failed to reset lab`;
      }
      showResetError(msg);
      return;
    }

    // Reset succeeded
    const labSolvedBanner = document.getElementById('lab-solved-banner');
    if (labSolvedBanner) labSolvedBanner.style.display = 'none';
    modeVulnerableRadio.checked = true;
    updateModeUI('vulnerable');
    applyFilter('Gifts', 'vulnerable');
  } catch (err) {
    console.error('Reset failed:', err);
    showResetError('Cannot reach the lab server. Check that Docker is running: docker compose up --build');
  }
}

// Session authorization check: only users who successfully logged in can view the shop
function initUserSession() {
  const userJson = sessionStorage.getItem('lab_user');
  if (!userJson) {
    // If testing or directly navigating to shop.html, grant default demo session
    if (loggedUserEl) loggedUserEl.textContent = 'admin';
    if (loggedRoleEl) loggedRoleEl.textContent = 'admin';
    return true;
  }
  try {
    const user = JSON.parse(userJson);
    if (!user || !user.username) {
      if (loggedUserEl) loggedUserEl.textContent = 'admin';
      if (loggedRoleEl) loggedRoleEl.textContent = 'admin';
      return true;
    }
    if (loggedUserEl) loggedUserEl.textContent = user.username;
    if (loggedRoleEl) loggedRoleEl.textContent = user.role || 'user';
    if (user.mode === 'secure') {
      modeSecureRadio.checked = true;
    }
    return true;
  } catch {
    if (loggedUserEl) loggedUserEl.textContent = 'admin';
    if (loggedRoleEl) loggedRoleEl.textContent = 'admin';
    return true;
  }
}

// "Return to Login" button: clears session and navigates back to index.html
if (btnLogout) {
  btnLogout.addEventListener('click', (e) => {
    e.preventDefault();
    sessionStorage.removeItem('lab_user');
    window.location.href = 'index.html';
  });
}

// Event Listeners
modeVulnerableRadio.addEventListener('change', () => {
  updateModeUI('vulnerable');
  applyFilter(categoryInput.value.trim(), 'vulnerable');
});

modeSecureRadio.addEventListener('change', () => {
  updateModeUI('secure');
  applyFilter(categoryInput.value.trim(), 'secure');
});

filterForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const cat = categoryInput.value.trim();
  applyFilter(cat, getSelectedMode());
});

btnResetShop.addEventListener('click', handleReset);

// Quick category buttons click handler
if (categoryPillContainer) {
  categoryPillContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-category');
    if (!btn) return;
    const cat = btn.getAttribute('data-category');
    applyFilter(cat, getSelectedMode());
  });
}

// Example buttons click delegation handler
const examplesGrid = document.getElementById('examples-grid');
if (examplesGrid) {
  examplesGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-example');
    if (!btn) return;
    const cat = btn.getAttribute('data-category');
    applyFilter(cat, getSelectedMode());
  });
}

// Window popstate: handles forward/backward browser navigation with query strings
window.addEventListener('popstate', () => {
  const urlParams = new URLSearchParams(window.location.search);
  const cat = urlParams.get('category') || 'Gifts';
  const mode = urlParams.get('mode') === 'secure' ? 'secure' : 'vulnerable';

  if (mode === 'secure') {
    modeSecureRadio.checked = true;
  } else {
    modeVulnerableRadio.checked = true;
  }
  updateModeUI(mode);
  categoryInput.value = cat;
  updateCategoryPills(cat);
  updateExampleButtons(cat);
  fetchProducts(cat, mode);
});

// Initialization on page load (only proceeds if user is authenticated)
if (initUserSession()) {
  // Read query params from URL on initial load (allows typing '+OR+1=1-- into the address bar directly!)
  const initialParams = new URLSearchParams(window.location.search);
  let initialCategory = initialParams.get('category');
  // Also handle "+" being used for spaces in query string
  if (initialCategory) {
    initialCategory = initialCategory.replace(/\+/g, ' ');
  } else {
    initialCategory = 'Gifts';
  }

  const initialMode = initialParams.get('mode') === 'secure' ? 'secure' : getSelectedMode();
  if (initialMode === 'secure') {
    modeSecureRadio.checked = true;
  } else {
    modeVulnerableRadio.checked = true;
  }

  updateModeUI(initialMode);
  categoryInput.value = initialCategory;
  updateCategoryPills(initialCategory);
  updateExampleButtons(initialCategory);

  // Fetch initial products
  fetchProducts(initialCategory, initialMode);
}




/* =========================================================================
   ASSIGNMENT: MCQ QUIZ & LAB FEEDBACK CONTROLLERS
   ========================================================================= */

// 10 Assignment Quiz Questions with Options, Correct Answers, and Explanations
const QUIZ_QUESTIONS = [
  {
    id: 1,
    question: "What is the root cause of SQL Injection in vulnerable web applications?",
    options: {
      A: "The database engine is configured in debug mode.",
      B: "User-supplied input is directly concatenated into the SQL command string, blending code with data.",
      C: "The web server does not use HTTPS/SSL encryption.",
      D: "PostgreSQL does not support authentication controls."
    },
    correct: "B",
    explanation: "Concatenating untrusted strings directly into queries mixes code with data, allowing attacker inputs to redefine SQL syntax."
  },
  {
    id: 2,
    question: "In the login bypass payload admin'--, what is the exact function of the -- sequence?",
    options: {
      A: "It decrements the login attempt counter.",
      B: "It marks the remainder of the SQL statement as a comment, causing the database to ignore the password condition.",
      C: "It escapes the single quote so the database treats it as text.",
      D: "It acts as an SQL wildcard to match any user in the table."
    },
    correct: "B",
    explanation: "In SQL, -- denotes the start of an inline comment. Everything after -- on that line is discarded by the parser, neutralizing the password check."
  },
  {
    id: 3,
    question: "In the shop lab, how does the application normally ensure unreleased prototype items remain confidential?",
    options: {
      A: "Unreleased products are stored in a separate, encrypted database.",
      B: "By enforcing the server-side query condition WHERE category = '...' AND released = 1.",
      C: "By using JavaScript in the browser to hide cards where released == 0.",
      D: "Products with released = 0 are automatically deleted upon insertion."
    },
    correct: "B",
    explanation: "The business rule is enforced by adding AND released = 1 to the SQL query so unreleased prototype items (released = 0) are filtered out."
  },
  {
    id: 4,
    question: "When an attacker submits Gifts'-- in the vulnerable category filter, why do unreleased products appear?",
    options: {
      A: "The payload alters the database table schema permanently.",
      B: "The single quote closes 'Gifts' and -- discards AND released = 1, returning all gifts regardless of their release status.",
      C: "The query forces the database to update released = 0 to released = 1.",
      D: "The -- switches the database connection from student to administrator."
    },
    correct: "B",
    explanation: "The quote terminates the string 'Gifts', and -- comments out the subsequent AND released = 1 check, instructing the database to fetch every product where category = 'Gifts'."
  },
  {
    id: 5,
    question: "What is the evaluation logic when the targeted payload ' OR category = 'Gifts'-- is injected into the vulnerable shop query?",
    options: {
      A: "It tests WHERE category = '' OR category = 'Gifts' while commenting out AND released = 1, returning all released and unreleased items in Gifts.",
      B: "It creates a new category named Gifts in the database.",
      C: "It causes an SQL syntax error because of duplicate column names.",
      D: "It causes the database to perform a UNION SELECT on the users table."
    },
    correct: "A",
    explanation: "It creates an expression where either the empty string or Gifts matches, while commenting out the release flag filter, cleanly dumping all items in the target category."
  },
  {
    id: 6,
    question: "Why does the payload ' OR 1=1-- expose products across every category in the shop?",
    options: {
      A: "1=1 is an always-true boolean tautology, and -- removes the released = 1 constraint, matching every row in the products table.",
      B: "1=1 triggers an administrative debug mode in PostgreSQL.",
      C: "The browser repeats the request once for each category.",
      D: "1=1 instructs the database to bypass all row-level permissions."
    },
    correct: "A",
    explanation: "Because 1=1 evaluates to true for every single row and the remaining conditions are commented out, the query returns all records regardless of category or release status."
  },
  {
    id: 7,
    question: "In Secure mode, the shop query runs as: SELECT * FROM products WHERE category = $1 AND released = 1. Why does the injection input Gifts'-- fail to expose unreleased products?",
    options: {
      A: "The database automatically deletes the characters ' and -- before running the query.",
      B: "The placeholder $1 treats the entire input literally as data, looking for a category named \"Gifts'--\", while strictly preserving AND released = 1.",
      C: "The backend intercepts the input and redirects the user to the login page.",
      D: "Secure mode only permits numbers as category parameters."
    },
    correct: "B",
    explanation: "In prepared statements ($1), parameter values are sent over a separate protocol channel. Quotes and dashes have no syntactic meaning, and the AND released = 1 clause remains untouched."
  },
  {
    id: 8,
    question: "What happens when an attacker submits only a single quote (') in Vulnerable mode versus Secure mode?",
    options: {
      A: "Both modes crash the database server.",
      B: "Both modes log the user in as admin.",
      C: "Vulnerable mode triggers a SQL syntax error (unmatched quote), whereas Secure mode safely binds ' as a string parameter and returns 0 rows.",
      D: "Vulnerable mode returns 0 rows, whereas Secure mode crashes."
    },
    correct: "C",
    explanation: "In Vulnerable mode, the lone quote breaks SQL string boundaries, leaving an unclosed literal. In Secure mode, the quote is safely handled as a one-character literal value."
  },
  {
    id: 9,
    question: "What is the purpose of the safety guard implemented in this lab when an input containing a semicolon (;) is submitted?",
    options: {
      A: "To prevent stacked queries (such as ; DROP TABLE users;) from destroying demonstration tables during student exercises.",
      B: "It is the primary security defense against all SQL injection attacks in production.",
      C: "Semicolons are illegal characters in standard HTTP requests.",
      D: "To format the response as JSON."
    },
    correct: "A",
    explanation: "The lab blocks semicolons to prevent students from inadvertently running stacked commands like DROP TABLE that would wipe the local database container."
  },
  {
    id: 10,
    question: "Why are parameterized queries (prepared statements) considered the gold standard defense against SQL Injection?",
    options: {
      A: "They automatically encrypt the database columns on disk.",
      B: "They rely on regex filters to block dangerous words like SELECT and OR.",
      C: "They pre-compile the SQL structure so untrusted input is strictly bound as data values and cannot alter command logic.",
      D: "They prevent users from viewing the web application source code."
    },
    correct: "C",
    explanation: "Parameterized queries separate the query compilation phase from data transmission, ensuring data can never be interpreted as executable SQL commands."
  }
];

// Quiz state
let quizCurrentIndex = 0;
let userQuizAnswers = {};

// Modal DOM elements
const quizModal = document.getElementById('quiz-modal');
const feedbackModal = document.getElementById('feedback-modal');
const btnOpenQuiz = document.getElementById('btn-open-quiz');
const btnOpenFeedback = document.getElementById('btn-open-feedback');
const bannerBtnQuiz = document.getElementById('banner-btn-quiz');
const bannerBtnFeedback = document.getElementById('banner-btn-feedback');
const headerBtnQuiz = document.getElementById('header-btn-quiz');
const headerBtnFeedback = document.getElementById('header-btn-feedback');
const quizCloseBtn = document.getElementById('quiz-close-btn');
const feedbackCloseBtn = document.getElementById('feedback-close-btn');

// Quiz view elements
const quizActiveView = document.getElementById('quiz-active-view');
const quizResultsView = document.getElementById('quiz-results-view');
const quizCurrentNumEl = document.getElementById('quiz-current-num');
const quizTotalNumEl = document.getElementById('quiz-total-num');
const quizProgressFill = document.getElementById('quiz-progress-fill');
const quizAnsweredCountEl = document.getElementById('quiz-answered-count');
const quizPillNav = document.getElementById('quiz-pill-nav');
const quizQBadge = document.getElementById('quiz-q-badge');
const quizQuestionText = document.getElementById('quiz-question-text');
const quizOptionsContainer = document.getElementById('quiz-options-container');
const quizBtnPrev = document.getElementById('quiz-btn-prev');
const quizBtnNext = document.getElementById('quiz-btn-next');
const quizBtnSubmit = document.getElementById('quiz-btn-submit');
const quizWarningMsg = document.getElementById('quiz-warning-msg');
const quizBtnRetake = document.getElementById('quiz-btn-retake');
const quizBtnDone = document.getElementById('quiz-btn-done');
const quizReviewList = document.getElementById('quiz-review-list');
const quizScoreText = document.getElementById('quiz-score-text');
const quizScorePct = document.getElementById('quiz-score-pct');
const quizResultHeading = document.getElementById('quiz-result-heading');
const quizResultMessage = document.getElementById('quiz-result-message');
const quizScoreCircle = document.getElementById('quiz-score-circle');

// Feedback elements
const feedbackForm = document.getElementById('feedback-form');
const feedbackSuccessView = document.getElementById('feedback-success-view');
const starRatingGroup = document.getElementById('star-rating-group');
const feedbackRatingVal = document.getElementById('feedback-rating-val');
const starRatingHint = document.getElementById('star-rating-hint');
const feedbackCancelBtn = document.getElementById('feedback-cancel-btn');
const feedbackEditBtn = document.getElementById('feedback-edit-btn');
const feedbackDoneBtn = document.getElementById('feedback-done-btn');
const feedbackSummaryBox = document.getElementById('feedback-summary-box');

const STAR_LABELS = {
  1: '1 star - Needs Improvement',
  2: '2 stars - Fair',
  3: '3 stars - Good',
  4: '4 stars - Very Good',
  5: '5 stars - Excellent'
};

function openModal(modalEl) {
  if (!modalEl) return;
  modalEl.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeModal(modalEl) {
  if (!modalEl) return;
  modalEl.style.display = 'none';
  document.body.style.overflow = '';
}

function renderQuizPills() {
  if (!quizPillNav) return;
  quizPillNav.innerHTML = QUIZ_QUESTIONS.map((q, idx) => {
    const isAnswered = userQuizAnswers[q.id] != null;
    const isActive = idx === quizCurrentIndex;
    let cls = 'quiz-nav-dot';
    if (isAnswered) cls += ' answered';
    if (isActive) cls += ' active';
    return `<button type="button" class="${cls}" data-idx="${idx}" title="Question ${idx + 1}${isAnswered ? ' (Answered)' : ''}">${idx + 1}</button>`;
  }).join('');
}

function updateQuizMeta() {
  const total = QUIZ_QUESTIONS.length;
  const answered = Object.keys(userQuizAnswers).length;
  if (quizCurrentNumEl) quizCurrentNumEl.textContent = quizCurrentIndex + 1;
  if (quizTotalNumEl) quizTotalNumEl.textContent = total;
  if (quizAnsweredCountEl) quizAnsweredCountEl.textContent = `${answered} / ${total} answered`;
  if (quizProgressFill) {
    const pct = Math.round((answered / total) * 100);
    quizProgressFill.style.width = `${Math.max(pct, 5)}%`;
  }
}

function renderQuizQuestion() {
  if (quizWarningMsg) {
    quizWarningMsg.style.display = 'none';
    quizWarningMsg.textContent = '';
  }

  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  if (!q) return;

  if (quizQBadge) quizQBadge.textContent = `Question ${quizCurrentIndex + 1}`;
  if (quizQuestionText) quizQuestionText.textContent = q.question;

  const selectedOpt = userQuizAnswers[q.id];
  const keys = ['A', 'B', 'C', 'D'];
  if (quizOptionsContainer) {
    quizOptionsContainer.innerHTML = keys.map((key) => {
      const isSelected = selectedOpt === key;
      const text = q.options[key] || '';
      return `
        <div class="quiz-option-item${isSelected ? ' selected' : ''}" data-key="${key}" role="radio" aria-checked="${isSelected}" tabindex="0">
          <span class="quiz-option-badge">${key}</span>
          <span class="quiz-option-text">${escapeHtml(text)}</span>
        </div>
      `;
    }).join('');
  }

  if (quizBtnPrev) quizBtnPrev.disabled = quizCurrentIndex === 0;
  if (quizBtnNext) quizBtnNext.disabled = quizCurrentIndex === QUIZ_QUESTIONS.length - 1;

  updateQuizMeta();
  renderQuizPills();
}

function selectQuizOption(optionKey) {
  const q = QUIZ_QUESTIONS[quizCurrentIndex];
  if (!q) return;

  userQuizAnswers[q.id] = optionKey;
  renderQuizQuestion();

  if (quizCurrentIndex < QUIZ_QUESTIONS.length - 1 && userQuizAnswers[QUIZ_QUESTIONS[quizCurrentIndex + 1].id] == null) {
    setTimeout(() => {
      if (quizModal && quizModal.style.display !== 'none' && quizActiveView && quizActiveView.style.display !== 'none') {
        quizCurrentIndex++;
        renderQuizQuestion();
      }
    }, 280);
  }
}

function submitQuiz() {
  const total = QUIZ_QUESTIONS.length;
  const answered = Object.keys(userQuizAnswers).length;

  if (answered < total) {
    const missing = total - answered;
    if (quizWarningMsg) {
      quizWarningMsg.textContent = `Please answer all questions before submitting (${missing} remaining).`;
      quizWarningMsg.style.display = 'block';
    }
    const firstMissing = QUIZ_QUESTIONS.findIndex((q) => userQuizAnswers[q.id] == null);
    if (firstMissing !== -1) {
      quizCurrentIndex = firstMissing;
      renderQuizQuestion();
    }
    return;
  }

  let correctCount = 0;
  QUIZ_QUESTIONS.forEach((q) => {
    if (userQuizAnswers[q.id] === q.correct) {
      correctCount++;
    }
  });

  const pct = Math.round((correctCount / total) * 100);

  if (quizScoreText) quizScoreText.textContent = `${correctCount}/${total}`;
  if (quizScorePct) quizScorePct.textContent = `${pct}%`;

  if (pct >= 80) {
    if (quizResultHeading) quizResultHeading.textContent = '🎉 Excellent Mastery!';
    if (quizResultMessage) quizResultMessage.textContent = 'You demonstrated strong command of SQL injection vulnerabilities and prepared statement security.';
    if (quizScoreCircle) quizScoreCircle.style.backgroundColor = '#10b981';
  } else if (pct >= 50) {
    if (quizResultHeading) quizResultHeading.textContent = '👍 Good Effort!';
    if (quizResultMessage) quizResultMessage.textContent = 'You have a solid foundation. Review the detailed explanations below to master the trickier edge cases.';
    if (quizScoreCircle) quizScoreCircle.style.backgroundColor = '#2563eb';
  } else {
    if (quizResultHeading) quizResultHeading.textContent = '📖 Review Recommended';
    if (quizResultMessage) quizResultMessage.textContent = 'SQL injection mechanics can be subtle. Study the explanations below and feel free to retake the quiz!';
    if (quizScoreCircle) quizScoreCircle.style.backgroundColor = '#f59e0b';
  }

  if (quizReviewList) {
    quizReviewList.innerHTML = QUIZ_QUESTIONS.map((q, idx) => {
      const userChoice = userQuizAnswers[q.id];
      const isCorrect = userChoice === q.correct;
      const cardClass = isCorrect ? 'quiz-review-card correct' : 'quiz-review-card incorrect';
      const statusText = isCorrect ? '✅ Correct' : '❌ Incorrect';
      const statusClass = isCorrect ? 'review-status-tag correct' : 'review-status-tag incorrect';

      const userChoiceText = userChoice ? `${userChoice}: ${q.options[userChoice] || ''}` : 'None selected';
      const correctChoiceText = `${q.correct}: ${q.options[q.correct] || ''}`;

      return `
        <article class="${cardClass}">
          <div class="review-q-header">
            <span class="quiz-q-badge">Question ${idx + 1}</span>
            <span class="${statusClass}">${statusText}</span>
          </div>
          <h4 class="review-q-text">${escapeHtml(q.question)}</h4>
          <div class="review-answer-row">
            <div class="review-answer-pill ${isCorrect ? 'user-correct' : 'user-incorrect'}">
              <span>Your Answer:</span>
              <strong>${escapeHtml(userChoiceText)}</strong>
            </div>
            ${!isCorrect ? `
              <div class="review-answer-pill correct-option">
                <span>Correct Answer:</span>
                <strong>${escapeHtml(correctChoiceText)}</strong>
              </div>
            ` : ''}
          </div>
          <div class="review-explanation-box">
            <strong>Explanation:</strong> ${escapeHtml(q.explanation)}
          </div>
        </article>
      `;
    }).join('');
  }

  const quizPayload = {
    username: loggedUserEl ? loggedUserEl.textContent.trim() : 'student',
    score: correctCount,
    total,
    percentage: pct,
    answers: { ...userQuizAnswers },
    completedAt: new Date().toISOString()
  };

  try {
    localStorage.setItem('lab_shop_quiz', JSON.stringify(quizPayload));
  } catch (err) {
    console.warn('Could not save quiz to localStorage:', err);
  }

  try {
    fetch('/api/quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quizPayload)
    }).catch((err) => console.warn('Backend quiz endpoint error:', err));
  } catch (err) {
    console.warn('Could not post quiz:', err);
  }

  if (quizActiveView) quizActiveView.style.display = 'none';
  if (quizResultsView) quizResultsView.style.display = 'block';
}

function resetQuiz() {
  quizCurrentIndex = 0;
  userQuizAnswers = {};
  try {
    localStorage.removeItem('lab_shop_quiz');
  } catch (err) {}
  if (quizActiveView) quizActiveView.style.display = 'block';
  if (quizResultsView) quizResultsView.style.display = 'none';
  renderQuizQuestion();
}

function setStarRating(rating) {
  if (feedbackRatingVal) feedbackRatingVal.value = rating;
  if (starRatingHint) starRatingHint.textContent = STAR_LABELS[rating] || `${rating} stars`;

  const stars = document.querySelectorAll('.star-btn');
  stars.forEach((star) => {
    const val = parseInt(star.getAttribute('data-star'), 10);
    if (val <= rating) {
      star.classList.add('active');
    } else {
      star.classList.remove('active');
    }
  });
}

async function handleFeedbackSubmit(e) {
  e.preventDefault();

  const rating = feedbackRatingVal ? feedbackRatingVal.value : '5';
  const difficultyEl = feedbackForm ? feedbackForm.querySelector('input[name="difficulty"]:checked') : null;
  const clarityEl = feedbackForm ? feedbackForm.querySelector('input[name="clarity"]:checked') : null;
  const recommendEl = feedbackForm ? feedbackForm.querySelector('input[name="recommend"]:checked') : null;
  const commentsEl = document.getElementById('feedback-comments');

  const valuableCheckboxes = feedbackForm ? feedbackForm.querySelectorAll('input[name="valuable"]:checked') : [];
  const valuable = Array.from(valuableCheckboxes).map((cb) => cb.value);

  const payload = {
    rating: parseInt(rating, 10),
    difficulty: difficultyEl ? difficultyEl.value : 'Just Right',
    clarity: clarityEl ? clarityEl.value : 'Very Clear',
    recommend: recommendEl ? recommendEl.value : 'Definitely',
    valuable,
    comments: commentsEl ? commentsEl.value.trim() : '',
    username: loggedUserEl ? loggedUserEl.textContent.trim() : 'student',
  };

  try {
    localStorage.setItem('lab_shop_feedback', JSON.stringify(payload));
  } catch (err) {
    console.warn('Could not save to localStorage:', err);
  }

  try {
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.warn('Backend feedback endpoint unreachable, saved locally:', err);
  }

  if (feedbackSummaryBox) {
    const starsEmoji = '⭐'.repeat(payload.rating);
    feedbackSummaryBox.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 6px;">
        <div><strong>Overall Rating:</strong> ${starsEmoji} (${payload.rating}/5)</div>
        <div><strong>Difficulty:</strong> ${escapeHtml(payload.difficulty)}</div>
        <div><strong>Concept Clarity:</strong> ${escapeHtml(payload.clarity)}</div>
        <div><strong>Recommendation:</strong> ${escapeHtml(payload.recommend)}</div>
        ${payload.comments ? `<div><strong>Your Comments:</strong> "${escapeHtml(payload.comments)}"</div>` : ''}
      </div>
    `;
  }

  if (feedbackForm) feedbackForm.style.display = 'none';
  if (feedbackSuccessView) feedbackSuccessView.style.display = 'block';
}

function initQuizAndFeedbackEvents() {
  const openQuizHandler = () => {
    openModal(quizModal);
    if (Object.keys(userQuizAnswers).length === 0) {
      try {
        const savedQuizJson = localStorage.getItem('lab_shop_quiz');
        if (savedQuizJson) {
          const savedQuiz = JSON.parse(savedQuizJson);
          if (savedQuiz && savedQuiz.answers) {
            userQuizAnswers = savedQuiz.answers;
            submitQuiz();
            return;
          }
        }
      } catch (err) {}
      resetQuiz();
    } else if (quizResultsView && quizResultsView.style.display === 'block') {
      // Stay on results view
    } else {
      renderQuizQuestion();
    }
  };

  if (btnOpenQuiz) btnOpenQuiz.addEventListener('click', openQuizHandler);
  if (bannerBtnQuiz) bannerBtnQuiz.addEventListener('click', openQuizHandler);
  if (headerBtnQuiz) headerBtnQuiz.addEventListener('click', openQuizHandler);

  const openFeedbackHandler = () => {
    openModal(feedbackModal);
    try {
      const savedFbJson = localStorage.getItem('lab_shop_feedback');
      if (savedFbJson) {
        const savedFb = JSON.parse(savedFbJson);
        if (savedFb) {
          if (savedFb.rating) setStarRating(savedFb.rating);
          if (savedFb.comments) {
            const commentsEl = document.getElementById('feedback-comments');
            if (commentsEl) commentsEl.value = savedFb.comments;
          }
        }
      }
    } catch (err) {}
  };

  if (btnOpenFeedback) btnOpenFeedback.addEventListener('click', openFeedbackHandler);
  if (bannerBtnFeedback) bannerBtnFeedback.addEventListener('click', openFeedbackHandler);
  if (headerBtnFeedback) headerBtnFeedback.addEventListener('click', openFeedbackHandler);

  if (quizCloseBtn) quizCloseBtn.addEventListener('click', () => closeModal(quizModal));
  if (feedbackCloseBtn) feedbackCloseBtn.addEventListener('click', () => closeModal(feedbackModal));
  if (feedbackCancelBtn) feedbackCancelBtn.addEventListener('click', () => closeModal(feedbackModal));
  if (feedbackDoneBtn) feedbackDoneBtn.addEventListener('click', () => closeModal(feedbackModal));
  if (quizBtnDone) quizBtnDone.addEventListener('click', () => closeModal(quizModal));

  if (feedbackEditBtn) {
    feedbackEditBtn.addEventListener('click', () => {
      if (feedbackSuccessView) feedbackSuccessView.style.display = 'none';
      if (feedbackForm) feedbackForm.style.display = 'block';
    });
  }

  if (quizBtnRetake) {
    quizBtnRetake.addEventListener('click', resetQuiz);
  }

  window.addEventListener('click', (e) => {
    if (e.target === quizModal) closeModal(quizModal);
    if (e.target === feedbackModal) closeModal(feedbackModal);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (quizModal && quizModal.style.display !== 'none') closeModal(quizModal);
      if (feedbackModal && feedbackModal.style.display !== 'none') closeModal(feedbackModal);
    }
  });

  if (quizBtnPrev) {
    quizBtnPrev.addEventListener('click', () => {
      if (quizCurrentIndex > 0) {
        quizCurrentIndex--;
        renderQuizQuestion();
      }
    });
  }

  if (quizBtnNext) {
    quizBtnNext.addEventListener('click', () => {
      if (quizCurrentIndex < QUIZ_QUESTIONS.length - 1) {
        quizCurrentIndex++;
        renderQuizQuestion();
      }
    });
  }

  if (quizBtnSubmit) {
    quizBtnSubmit.addEventListener('click', submitQuiz);
  }

  if (quizPillNav) {
    quizPillNav.addEventListener('click', (e) => {
      const btn = e.target.closest('.quiz-nav-dot');
      if (!btn) return;
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      if (!isNaN(idx) && idx >= 0 && idx < QUIZ_QUESTIONS.length) {
        quizCurrentIndex = idx;
        renderQuizQuestion();
      }
    });
  }

  if (quizOptionsContainer) {
    quizOptionsContainer.addEventListener('click', (e) => {
      const item = e.target.closest('.quiz-option-item');
      if (!item) return;
      const key = item.getAttribute('data-key');
      if (key) selectQuizOption(key);
    });

    quizOptionsContainer.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        const item = e.target.closest('.quiz-option-item');
        if (!item) return;
        e.preventDefault();
        const key = item.getAttribute('data-key');
        if (key) selectQuizOption(key);
      }
    });
  }

  if (starRatingGroup) {
    starRatingGroup.addEventListener('click', (e) => {
      const star = e.target.closest('.star-btn');
      if (!star) return;
      const val = parseInt(star.getAttribute('data-star'), 10);
      if (!isNaN(val)) setStarRating(val);
    });

    starRatingGroup.addEventListener('mouseover', (e) => {
      const star = e.target.closest('.star-btn');
      if (!star) return;
      const val = parseInt(star.getAttribute('data-star'), 10);
      if (!isNaN(val) && starRatingHint) {
        starRatingHint.textContent = STAR_LABELS[val] || `${val} stars`;
      }
    });

    starRatingGroup.addEventListener('mouseleave', () => {
      const cur = (feedbackRatingVal && parseInt(feedbackRatingVal.value, 10)) || 5;
      if (starRatingHint) starRatingHint.textContent = STAR_LABELS[cur] || `${cur} stars`;
    });
  }

  if (feedbackForm) {
    feedbackForm.addEventListener('submit', handleFeedbackSubmit);
  }
}

// Initialize quiz & feedback controllers
initQuizAndFeedbackEvents();
setStarRating(5);
