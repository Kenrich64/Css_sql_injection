// log.js
// Activity log table. Newest attempt first.
//  - On page load it asks the server for earlier attempts (GET /api/logs), so a refresh keeps the list.
//  - After every login it adds a row from the 'lab:result' event.
//  - On 'lab:reset' it clears the list (the server clears its own log on reset).
(function () {
  const root = document.getElementById('log');
  if (!root) return;

  const MAX = 200;
  let entries = [];   // newest last, same order as the server

  function esc(text) {
    return String(text)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function clock(value) {
    const d = new Date(value);
    return isNaN(d) ? '' : d.toLocaleTimeString();
  }

  const PILL = {
    'vulnerable-bypass': 'Injection worked',
    'blocked': 'Blocked',
    'error': 'Error',
    'normal': 'Normal'
  };

  function render() {
    if (!entries.length) {
      root.innerHTML = '<p class="log-empty">No attempts yet. Every login you try will be listed here.</p>';
      return;
    }
    const rows = entries.slice().reverse().map(function (e) {
      const pill = PILL[e.status] || esc(e.status || '');
      return '<tr>' +
        '<td>' + esc(clock(e.time)) + '</td>' +
        '<td>' + esc(e.mode) + '</td>' +
        '<td class="log-user">' + esc(e.username) + '</td>' +
        '<td>' + esc(e.outcome) + '</td>' +
        '<td><span class="log-pill ' + esc(e.status) + '">' + pill + '</span></td>' +
        '<td class="log-sql" title="' + esc(e.sql) + '">' + (e.sql ? esc(e.sql) : 'query not run') + '</td>' +
        '</tr>';
    }).join('');

    root.innerHTML = '<p class="log-count">' + entries.length + (entries.length === 1 ? ' attempt' : ' attempts') + '</p>' +
      '<div class="log-wrap"><table class="log-table"><thead><tr>' +
      '<th>Time</th><th>Mode</th><th>Username</th><th>Outcome</th><th>Status</th><th>SQL</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div>';
  }

  function add(entry) {
    entries.push(entry);
    if (entries.length > MAX) entries.shift();
    render();
  }

  // Same wording the server uses in its own log
  function outcomeOf(d) {
    if (d.success) return 'login ok';
    return d.status === 'error' && d.sql ? 'sql error' : 'login failed';
  }

  document.addEventListener('lab:result', function (e) {
    const d = e.detail;
    add({ time: d.time, mode: d.mode, username: d.username, sql: d.sql || '', status: d.status, outcome: outcomeOf(d) });
  });

  document.addEventListener('lab:reset', function () { entries = []; render(); });

  render();

  // Load attempts that happened before this page was opened
  fetch('/api/logs')
    .then(function (res) { return res.ok ? res.json() : []; })
    .then(function (list) {
      if (Array.isArray(list) && !entries.length) { entries = list.slice(-MAX); render(); }
    })
    .catch(function () { /* server not reachable: keep the empty state */ });
})();