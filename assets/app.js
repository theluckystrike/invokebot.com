/* invokebot.com — Webhook Request Builder */
(function() {
  'use strict';

  var MAX_HISTORY = 20;
  var HISTORY_KEY = 'invokebot_history';

  /* DOM refs */
  var methodSelect = document.getElementById('methodSelect');
  var urlInput = document.getElementById('urlInput');
  var headersContainer = document.getElementById('headersContainer');
  var addHeaderBtn = document.getElementById('addHeaderBtn');
  var bodyEditor = document.getElementById('bodyEditor');
  var sendBtn = document.getElementById('sendBtn');
  var generateBtn = document.getElementById('generateBtn');
  var codeOutput = document.getElementById('codeOutput');
  var responsePanel = document.getElementById('responsePanel');
  var historyList = document.getElementById('historyList');
  var bodyTabs = document.querySelectorAll('.body-tab');
  var codeTabs = document.querySelectorAll('.code-tab');

  if (!methodSelect) return; /* Not on tool page */

  var currentBodyMode = 'json';
  var currentCodeTab = 'curl';

  /* Header management */
  function createHeaderRow(key, value) {
    var row = document.createElement('div');
    row.className = 'header-row';
    var keyInput = document.createElement('input');
    keyInput.type = 'text';
    keyInput.placeholder = 'Header name';
    keyInput.value = key || '';
    var valInput = document.createElement('input');
    valInput.type = 'text';
    valInput.placeholder = 'Value';
    valInput.value = value || '';
    var removeBtn = document.createElement('button');
    removeBtn.className = 'remove-header';
    removeBtn.textContent = 'x';
    removeBtn.addEventListener('click', function() { row.remove(); });
    row.appendChild(keyInput);
    row.appendChild(valInput);
    row.appendChild(removeBtn);
    headersContainer.appendChild(row);
  }

  function getHeaders() {
    var rows = headersContainer.querySelectorAll('.header-row');
    var headers = {};
    for (var i = 0; i < rows.length; i++) {
      var inputs = rows[i].querySelectorAll('input');
      var k = inputs[0].value.trim();
      var v = inputs[1].value.trim();
      if (k) headers[k] = v;
    }
    return headers;
  }

  /* Common header buttons */
  function initCommonHeaders() {
    var btns = document.querySelectorAll('.common-header-btn');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function() {
        var key = this.getAttribute('data-key');
        var val = this.getAttribute('data-value');
        createHeaderRow(key, val);
      });
    }
  }

  /* Body mode tabs */
  function initBodyTabs() {
    for (var i = 0; i < bodyTabs.length; i++) {
      bodyTabs[i].addEventListener('click', function() {
        for (var j = 0; j < bodyTabs.length; j++) bodyTabs[j].classList.remove('active');
        this.classList.add('active');
        currentBodyMode = this.getAttribute('data-mode');
        if (currentBodyMode === 'json') {
          bodyEditor.placeholder = '{\n  "key": "value"\n}';
        } else {
          bodyEditor.placeholder = 'key=value&another=value';
        }
      });
    }
  }

  /* Code generation */
  function generateCode(method, url, headers, body) {
    var headerKeys = Object.keys(headers);
    var result = {};

    /* curl */
    var curl = "curl -X " + method + " \\\n  '" + url + "'";
    for (var i = 0; i < headerKeys.length; i++) {
      curl += " \\\n  -H '" + headerKeys[i] + ": " + headers[headerKeys[i]] + "'";
    }
    if (body && method !== 'GET') {
      curl += " \\\n  -d '" + body.replace(/'/g, "'\\''") + "'";
    }
    result.curl = curl;

    /* Python */
    var py = "import requests\n\n";
    py += "url = '" + url + "'\n";
    if (headerKeys.length > 0) {
      py += "headers = {\n";
      for (var p = 0; p < headerKeys.length; p++) {
        py += "    '" + headerKeys[p] + "': '" + headers[headerKeys[p]] + "'";
        py += p < headerKeys.length - 1 ? ",\n" : "\n";
      }
      py += "}\n";
    }
    if (body && method !== 'GET') {
      py += "data = '''" + body + "'''\n\n";
      py += "response = requests." + method.toLowerCase() + "(url";
      if (headerKeys.length > 0) py += ", headers=headers";
      py += ", data=data)\n";
    } else {
      py += "\nresponse = requests." + method.toLowerCase() + "(url";
      if (headerKeys.length > 0) py += ", headers=headers";
      py += ")\n";
    }
    py += "print(response.status_code)\nprint(response.text)";
    result.python = py;

    /* JavaScript fetch */
    var js = "const options = {\n  method: '" + method + "'";
    if (headerKeys.length > 0) {
      js += ",\n  headers: {\n";
      for (var f = 0; f < headerKeys.length; f++) {
        js += "    '" + headerKeys[f] + "': '" + headers[headerKeys[f]] + "'";
        js += f < headerKeys.length - 1 ? ",\n" : "\n";
      }
      js += "  }";
    }
    if (body && method !== 'GET') {
      js += ",\n  body: JSON.stringify(" + body + ")";
    }
    js += "\n};\n\nfetch('" + url + "', options)\n";
    js += "  .then(res => res.json())\n  .then(data => console.log(data))\n";
    js += "  .catch(err => console.error(err));";
    result.fetch = js;

    /* Node.js axios */
    var ax = "const axios = require('axios');\n\n";
    ax += "axios({\n  method: '" + method.toLowerCase() + "',\n";
    ax += "  url: '" + url + "'";
    if (headerKeys.length > 0) {
      ax += ",\n  headers: {\n";
      for (var a = 0; a < headerKeys.length; a++) {
        ax += "    '" + headerKeys[a] + "': '" + headers[headerKeys[a]] + "'";
        ax += a < headerKeys.length - 1 ? ",\n" : "\n";
      }
      ax += "  }";
    }
    if (body && method !== 'GET') {
      ax += ",\n  data: " + body;
    }
    ax += "\n})\n.then(res => console.log(res.status, res.data))\n";
    ax += ".catch(err => console.error(err.message));";
    result.axios = ax;

    return result;
  }

  function showCode(tab) {
    var method = methodSelect.value;
    var url = urlInput.value.trim() || 'https://api.example.com/endpoint';
    var headers = getHeaders();
    var body = bodyEditor.value.trim();
    var codes = generateCode(method, url, headers, body);
    codeOutput.textContent = codes[tab] || '';
    currentCodeTab = tab;
  }

  function initCodeTabs() {
    for (var i = 0; i < codeTabs.length; i++) {
      codeTabs[i].addEventListener('click', function() {
        for (var j = 0; j < codeTabs.length; j++) codeTabs[j].classList.remove('active');
        this.classList.add('active');
        showCode(this.getAttribute('data-tab'));
      });
    }
  }

  /* Copy button */
  function initCopyBtn() {
    var copyBtn = document.getElementById('copyCodeBtn');
    if (copyBtn) {
      copyBtn.addEventListener('click', function() {
        navigator.clipboard.writeText(codeOutput.textContent).then(function() {
          copyBtn.textContent = 'Copied!';
          setTimeout(function() { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
    }
  }

  /* Send request */
  function sendRequest() {
    var method = methodSelect.value;
    var url = urlInput.value.trim();
    if (!url) { alert('Please enter a URL.'); return; }
    if (url.indexOf('http') !== 0) url = 'https://' + url;

    var headers = getHeaders();
    var body = bodyEditor.value.trim();

    var fetchOpts = { method: method, headers: headers, mode: 'cors' };
    if (body && method !== 'GET') {
      fetchOpts.body = body;
    }

    responsePanel.innerHTML = '<div class="panel-title">Response</div><div style="color:var(--text-muted);">Sending...</div>';
    var startTime = Date.now();

    fetch(url, fetchOpts).then(function(res) {
      var elapsed = Date.now() - startTime;
      var statusClass = res.status < 300 ? 'status-ok' : (res.status < 400 ? 'status-redirect' : 'status-error');

      var respHeaders = '';
      res.headers.forEach(function(val, key) {
        respHeaders += key + ': ' + val + '\n';
      });

      return res.text().then(function(bodyText) {
        var formatted = bodyText;
        try { formatted = JSON.stringify(JSON.parse(bodyText), null, 2); } catch(e) { /* not JSON */ }

        responsePanel.innerHTML = '<div class="panel-title">Response</div>' +
          '<div class="response-status"><span class="' + statusClass + '">' + res.status + ' ' + res.statusText + '</span>' +
          '<span class="response-timing">' + elapsed + 'ms</span></div>' +
          '<div class="response-headers">' + escapeHtml(respHeaders) + '</div>' +
          '<div class="response-body">' + escapeHtml(formatted) + '</div>';

        saveHistory(method, url, res.status, elapsed);
      });
    }).catch(function(err) {
      var elapsed = Date.now() - startTime;
      responsePanel.innerHTML = '<div class="panel-title">Response</div>' +
        '<div class="response-status"><span class="status-error">Error</span>' +
        '<span class="response-timing">' + elapsed + 'ms</span></div>' +
        '<div class="response-body">' + escapeHtml(err.message) + '</div>';
      saveHistory(method, url, 'ERR', elapsed);
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* History */
  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; }
    catch(e) { return []; }
  }

  function saveHistory(method, url, status, timing) {
    var history = getHistory();
    history.unshift({
      method: method,
      url: url,
      status: status,
      timing: timing,
      time: new Date().toLocaleTimeString()
    });
    if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    renderHistory();
  }

  function renderHistory() {
    var history = getHistory();
    if (!historyList) return;
    historyList.innerHTML = '';
    for (var i = 0; i < history.length; i++) {
      var item = history[i];
      var div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = '<span class="history-method ' + item.method.toLowerCase() + '">' + item.method + '</span>' +
        '<span class="history-url">' + escapeHtml(item.url.substring(0, 40)) + '</span>' +
        '<span class="history-time">' + item.status + ' &middot; ' + item.timing + 'ms &middot; ' + item.time + '</span>';
      (function(entry) {
        div.addEventListener('click', function() {
          methodSelect.value = entry.method;
          urlInput.value = entry.url;
        });
      })(item);
      historyList.appendChild(div);
    }
  }

  /* Init */
  addHeaderBtn.addEventListener('click', function() { createHeaderRow('', ''); });
  sendBtn.addEventListener('click', sendRequest);
  generateBtn.addEventListener('click', function() { showCode(currentCodeTab); });
  initCommonHeaders();
  initBodyTabs();
  initCodeTabs();
  initCopyBtn();
  createHeaderRow('Content-Type', 'application/json');
  renderHistory();
})();
