// visualizer.js
// Draws the 4-step flow  Input -> SQL sent -> Database -> Result
// It does not call the server. It only listens to the events that app.js fires:
//   'lab:result'  after every login   (detail = time, mode, username, password,
//                                      success, sql, rows, status, message)
//   'lab:reset'   when the lab is reset
(function () {
  const root = document.getElementById('visualizer');
  if (!root) return;

  const EMPTY = '<p class="viz-empty">Log in to see how your input travels: input, SQL, database, result.</p>';

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Step 2: the SQL, with the student's own text highlighted
  function sqlBox(d) {
    if (!d.sql) {
      return '<div class="viz-sql">Not sent.</div>';
    }
    if (d.mode === 'vulnerable') {
      // Same pieces the server joined together, so we can mark what the student typed.
      const parts = ["SELECT * FROM users WHERE username='", d.username, "' AND password='", d.password, "'"];
      if (parts.join('') === d.sql) {
        return '<div class="viz-sql">' +
          parts.map((t, i) => (i % 2 ? '<mark>' + esc(t) + '</mark>' : esc(t))).join('') + '</div>';
      }
      return '<div class="viz-sql">' + esc(d.sql) + '</div>';
    }
    return '<div class="viz-sql safe-sql">' + esc(d.sql) +
      '<span class="viz-params">$1 = <mark>' + esc(d.username) + '</mark>, $2 = <mark>' +
      esc(d.password) + '</mark></span></div>';
  }

  function step(title, tone, main, note, extra) {
    return '<div class="viz-step ' + tone + '"><h4>' + title + '</h4>' +
      '<div class="viz-main">' + main + '</div>' +
      (extra || '') +
      (note ? '<p class="viz-note">' + note + '</p>' : '') + '</div>';
  }

  function render(d) {
    const guard = d.status === 'error' && !d.sql;       // blocked by the lab's safety guard
    const rows = Array.isArray(d.rows) ? d.rows : [];
    const names = rows.map(function (r) { return esc(r.username); }).join(', ');

    // Step 1: input
    const s1 = step('1. Your input', 'ok',
      'username: <code>' + esc(d.username) + '</code><br>password: <code>' + esc(d.password) + '</code>',
      d.mode === 'vulnerable' ? 'Sent to a server in Vulnerable mode.' : 'Sent to a server in Secure mode.');

    // Step 2: SQL
    let s2note;
    if (guard) s2note = 'The lab\'s safety guard stopped this input before a query was built.';
    else if (d.mode === 'vulnerable') s2note = 'The server joined your text into the SQL. Highlighted = what you typed.';
    else s2note = 'The SQL stays fixed. Your text travels separately as data ($1, $2).';
    // Red only when the injection actually worked. A normal login stays neutral.
    const s2tone = guard ? 'warn'
      : (d.status === 'vulnerable-bypass' ? 'bad'
      : (d.mode === 'secure' ? 'safe' : ''));
    const s2 = step('2. SQL sent', s2tone, '', s2note, sqlBox(d));

    // Step 3: database
    let s3tone = 'ok', s3main, s3note;
    if (guard) {
      s3tone = 'warn'; s3main = 'Not contacted';
      s3note = 'No query reached the database.';
    } else if (d.status === 'vulnerable-bypass') {
      s3tone = 'bad'; s3main = 'Matched ' + rows.length + (rows.length === 1 ? ' row' : ' rows');
      s3note = 'Your quote closed the text early, and OR 1=1 or -- changed the condition, so the password check no longer protected the login.';
    } else if (d.status === 'blocked') {
      s3tone = 'safe'; s3main = 'Matched 0 rows';
      s3note = 'The database looked for a user whose name is literally your text. None exists.';
    } else if (d.status === 'error') {
      s3tone = 'warn'; s3main = 'Rejected the query';
      s3note = 'Your input broke the SQL syntax. ' + esc(d.message || '');
    } else {
      s3main = 'Matched ' + rows.length + (rows.length === 1 ? ' row' : ' rows');
      s3note = rows.length ? 'Username and password matched a stored user.' : 'No user has this username and password.';
    }
    const s3 = step('3. Database', s3tone, s3main, s3note);

    // Step 4: result
    const s4tone = d.success ? (d.status === 'vulnerable-bypass' ? 'bad' : 'ok') : (d.status === 'blocked' ? 'safe' : 'warn');
    const s4main = d.success ? 'Login successful' : 'Login failed';
    let s4note;
    if (d.success && d.status === 'vulnerable-bypass') s4note = 'Logged in as ' + names + ' without a valid password. This is SQL injection.';
    else if (d.success) s4note = 'Logged in as ' + names + '.';
    else if (d.status === 'blocked') s4note = 'Secure mode treated the attack as plain text. The attack failed.';
    else if (guard) s4note = 'Blocked by the safety guard.';
    else s4note = esc(d.message || 'Invalid credentials');
    const s4 = step('4. Result', s4tone, s4main, s4note);

    const modeLine = d.mode === 'vulnerable'
      ? 'Vulnerable mode: the server builds the SQL by joining your text into it.'
      : 'Secure mode: the server sends your text as data, separate from the SQL.';

    root.innerHTML = '<p class="viz-mode">' + modeLine + '</p>' +
      '<div class="viz-flow">' + s1 + '<div class="viz-arrow" aria-hidden="true">&rarr;</div>' +
      s2 + '<div class="viz-arrow" aria-hidden="true">&rarr;</div>' +
      s3 + '<div class="viz-arrow" aria-hidden="true">&rarr;</div>' + s4 + '</div>';
  }

  document.addEventListener('lab:result', function (e) { render(e.detail); });
  document.addEventListener('lab:reset', function () { root.innerHTML = EMPTY; });
  root.innerHTML = EMPTY;
})();