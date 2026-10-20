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

  // If unreleased products are visible (released = 0), show lab solved and warning banner
  if (unreleasedCount > 0) {
    if (labSolvedBanner) labSolvedBanner.style.display = 'flex';
    unreleasedAlertEl.style.display = 'block';
    unreleasedAlertEl.innerHTML = `
      <div class="unreleased-banner">
        <span>⚠️ <strong>SQL INJECTION WARNING:</strong> ${unreleasedCount} hidden/unreleased prototype product(s) are visible because the query logic was bypassed!</span>
      </div>
    `;
  } else {
    if (labSolvedBanner) labSolvedBanner.style.display = 'none';
    unreleasedAlertEl.style.display = 'none';
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
    // If not logged in, redirect directly back to the login lab
    window.location.replace('index.html');
    return false;
  }
  try {
    const user = JSON.parse(userJson);
    if (!user || !user.username) {
      window.location.replace('index.html');
      return false;
    }
    if (loggedUserEl) loggedUserEl.textContent = user.username;
    if (loggedRoleEl) loggedRoleEl.textContent = user.role || 'user';
    if (user.mode === 'secure') {
      modeSecureRadio.checked = true;
    }
    return true;
  } catch {
    window.location.replace('index.html');
    return false;
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

