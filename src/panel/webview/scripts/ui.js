/* ui.js — shared webview UI helpers and button wiring */

const vscode = acquireVsCodeApi();

const TAB_IDS = [
  'tab-analyze',
  'tab-graph',
  'tab-summary',
  'tab-qa',
  'tab-flow',
  'tab-aitools',
  'tab-history',
  'tab-settings',
];

const PROVIDERS = ['groq', 'ollama', 'gemini', 'anthropic', 'openai'];

function postMsg(message) {
  vscode.postMessage(message);
}

function escHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(value) {
  return escHtml(value).replace(/`/g, '&#96;');
}

function byId(id) {
  return document.getElementById(id);
}

function bindClick(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener('click', handler);
}

function bindInput(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener('input', handler);
}

function bindChange(id, handler) {
  const el = byId(id);
  if (el) el.addEventListener('change', handler);
}

function activateTab(index) {
  const buttons = document.querySelectorAll('.tabs .tab');
  const screens = TAB_IDS.map((id) => byId(id)).filter(Boolean);

  buttons.forEach((btn, i) => btn.classList.toggle('active', i === index));
  screens.forEach((screen, i) => {
    screen.classList.toggle('active', i === index);
    screen.style.display = i === index ? 'flex' : 'none';
  });
}

function showAlert(scope, message, kind = 'info') {
  const el = byId(`${scope}-alert`);
  if (!el) return;
  el.innerHTML = `<div class="alert alert-${kind}">${escHtml(message)}</div>`;
}

function setProgress(step, pct, message) {
  const wrap = byId('progress-wrap');
  const bar = byId('pbar');
  const msg = byId('progress-msg');
  if (wrap) wrap.style.display = 'block';
  if (bar) bar.style.width = `${pct}%`;
  if (msg) msg.textContent = message || 'Working...';

  for (let i = 1; i <= 5; i++) {
    const el = byId(`ps${i}`);
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    else if (i === step) el.classList.add('active');
  }
}

function setAnalyzing(isBusy) {
  const btn = byId('local-analyze-btn');
  if (btn) {
    btn.disabled = !!isBusy;
    btn.textContent = isBusy ? 'Analyzing...' : 'Analyze Current Workspace';
  }
  const wrap = byId('progress-wrap');
  if (wrap && isBusy) wrap.style.display = 'block';
}

function enableQA() {
  const empty = byId('qa-empty');
  const ready = byId('qa-ready');
  if (empty) empty.style.display = 'none';
  if (ready) ready.style.display = 'flex';
}

function addMsg(role, text) {
  const history = byId('chat-history');
  if (!history) return;

  const row = document.createElement('div');
  row.className = `chat-msg chat-${role}`;
  row.style.cssText = 'margin-bottom:8px;padding:8px 10px;border:1px solid var(--vscode-panel-border);border-radius:6px;white-space:pre-wrap;line-height:1.55;';
  row.textContent = text;
  history.appendChild(row);
  history.scrollTop = history.scrollHeight;
}

function removeThinking() {
  byId('thinking-msg')?.remove();
}

function addThinking() {
  removeThinking();
  const history = byId('chat-history');
  if (!history) return;

  const row = document.createElement('div');
  row.id = 'thinking-msg';
  row.className = 'chat-msg chat-ai';
  row.style.cssText = 'margin-bottom:8px;padding:8px 10px;border:1px solid var(--vscode-panel-border);border-radius:6px;opacity:0.8;font-style:italic;';
  row.textContent = 'Thinking...';
  history.appendChild(row);
  history.scrollTop = history.scrollHeight;
}

function sendQ() {
  const input = byId('chat-input');
  if (!input) return;

  const question = input.value.trim();
  if (!question) return;

  input.value = '';
  addMsg('user', question);
  addThinking();
  postMsg({ type: 'askQuestion', payload: { question } });
}

function chatKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendQ();
  }
}

function showSummary(summary, repoName) {
  const empty = byId('summary-empty');
  const ready = byId('summary-ready');
  if (empty) empty.style.display = 'none';
  if (ready) ready.style.display = 'block';

  const files = Object.values(fileSummaryMap || {});
  if (byId('s-name')) byId('s-name').textContent = repoName || '';
  if (byId('s-overview')) byId('s-overview').textContent = summary?.overview || '';
  if (byId('s-arch')) byId('s-arch').textContent = summary?.architecture || '';

  const tech = byId('s-tech');
  if (tech) {
    tech.innerHTML = (summary?.techStack || []).map((t) => `<span class="chip">${escHtml(t)}</span>`).join(' ');
  }

  const modules = byId('s-modules');
  if (modules) {
    modules.innerHTML = (summary?.keyModules || []).map((m) => `
      <div class="card" style="margin-bottom:6px">
        <div class="card-title">${escHtml(m.name)}</div>
        <div class="card-body">${escHtml(m.description)}</div>
      </div>
    `).join('');
  }

  const entries = byId('s-entries');
  if (entries) {
    entries.innerHTML = (summary?.entryPoints || []).map((p) => `<div>${escHtml(p)}</div>`).join('');
  }

  const count = byId('s-file-count');
  if (count) count.textContent = files.length ? `(${files.length})` : '';

  const list = byId('s-files');
  if (list) {
    list.innerHTML = files.map((file) => `
      <div class="card" style="margin-bottom:6px">
        <div class="card-title" style="display:flex;justify-content:space-between;gap:8px">
          <span style="word-break:break-all">${escHtml(file.path)}</span>
          <span class="badge badge-${escAttr(file.complexity || 'low')}">${escHtml(file.complexity || 'low')}</span>
        </div>
        <div class="card-body">${escHtml(file.purpose || '')}</div>
      </div>
    `).join('');
  }
}

function showFileSummaries(items) {
  for (const key of Object.keys(fileSummaryMap)) delete fileSummaryMap[key];
  (items || []).forEach((item) => { fileSummaryMap[item.path] = item; });

  if (byId('summary-ready')?.style.display !== 'none') {
    showSummary(_summary, _repoName);
  }
}

function showHistory(records) {
  const empty = byId('history-empty');
  const ready = byId('history-ready');
  const list = byId('history-list');
  if (empty) empty.style.display = records?.length ? 'none' : 'flex';
  if (ready) ready.style.display = records?.length ? 'block' : 'none';
  if (!list) return;

  if (!records?.length) {
    list.innerHTML = '';
    return;
  }

  list.innerHTML = records.map((record) => `
    <div class="card" style="margin-bottom:8px">
      <div class="card-title" style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">
        <span style="word-break:break-word">${escHtml(record.label || record.repoName || 'Analysis')}</span>
        <span style="font-size:10px;color:var(--vscode-descriptionForeground)">${new Date(record.timestamp).toLocaleString()}</span>
      </div>
      <div class="card-body" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center">
        <span class="chip">${escHtml(record.repoName || '')}</span>
        <button class="btn btn-sm load-history-btn" data-id="${escAttr(record.id)}">Load</button>
        <button class="btn btn-sm btn-secondary delete-history-btn" data-id="${escAttr(record.id)}">Delete</button>
      </div>
    </div>
  `).join('');

  list.querySelectorAll('.load-history-btn').forEach((btn) => {
    btn.addEventListener('click', () => postMsg({ type: 'loadAnalysis', payload: { id: btn.dataset.id } }));
  });
  list.querySelectorAll('.delete-history-btn').forEach((btn) => {
    btn.addEventListener('click', () => postMsg({ type: 'deleteAnalysis', payload: { id: btn.dataset.id } }));
  });
}

function applySettingsLoaded(payload) {
  if (!payload?.providerName) return;

  for (const provider of PROVIDERS) {
    const modelSelect = byId(`model-${provider}`);
    const customModel = byId(`custom-model-${provider}`);
    const baseUrl = byId(`baseurl-${provider}`);
    if (modelSelect && payload.providerName === provider && payload.model) {
      const hasOption = [...modelSelect.options].some((opt) => opt.value === payload.model);
      if (hasOption) {
        modelSelect.value = payload.model;
        if (customModel) customModel.style.display = 'none';
      } else {
        modelSelect.value = '__custom__';
        if (customModel) {
          customModel.style.display = 'block';
          customModel.value = payload.model;
        }
      }
    }
    if (baseUrl && payload.providerName === provider && payload.baseUrl) baseUrl.value = payload.baseUrl;
  }

  if (payload.hasKey === false) {
    showAlert('settings', `Loaded ${payload.providerName} settings. Add an API key if needed.`, 'info');
  }
}

function updateTokenDisplay(total) {
  const el = byId('token-display');
  if (el) el.textContent = `Total tokens used: ${total || 0}`;
}

function setAIToolBusy(docType, busy) {
  const ids = {
    readme: 'gen-readme-btn',
    architecture: 'gen-arch-btn',
    onboarding: 'gen-onboarding-btn',
    refactor: 'refactor-btn',
    pr: 'review-pr-btn',
  };
  const btn = byId(ids[docType]);
  if (!btn) return;
  btn.disabled = !!busy;
  if (docType === 'pr' && busy) btn.textContent = 'Reviewing...';
  if (docType === 'pr' && !busy) btn.textContent = 'Review PR';
  if (docType === 'refactor' && busy) btn.textContent = 'Analyzing...';
  if (docType === 'refactor' && !busy) btn.textContent = '🔍 Analyze Code Quality';
}

function collectProviderPayload(name) {
  const key = byId(`key-${name}`)?.value?.trim() || '';
  const modelSelect = byId(`model-${name}`);
  const customModel = byId(`custom-model-${name}`)?.value?.trim() || '';
  const baseUrl = byId(`baseurl-${name}`)?.value?.trim() || '';
  const model = modelSelect?.value === '__custom__' ? customModel : modelSelect?.value;

  const payload = { name };
  if (key) payload.apiKey = key;
  if (model) payload.model = model;
  if (baseUrl) payload.baseUrl = baseUrl;
  return payload;
}

function syncCustomModelField(name) {
  const select = byId(`model-${name}`);
  const custom = byId(`custom-model-${name}`);
  if (!select || !custom) return;
  custom.style.display = select.value === '__custom__' ? 'block' : 'none';
}

function wireProviderControls() {
  for (const provider of PROVIDERS) {
    const card = byId(`pc-${provider}`);
    const fields = byId(`pf-${provider}`);
    const select = byId(`model-${provider}`);
    if (select) {
      select.addEventListener('change', () => syncCustomModelField(provider));
      syncCustomModelField(provider);
    }
    const btn = document.querySelector(`.save-provider-btn[data-name="${provider}"]`);
    if (btn) {
      btn.addEventListener('click', () => {
        postMsg({ type: 'saveProvider', payload: collectProviderPayload(provider) });
      });
    }

    if (card && fields) {
      fields.classList.add('open');
      card.classList.add('selected');
      card.addEventListener('click', (event) => {
        if (event.target.closest('input, select, button, a, textarea, label')) return;
        const isOpen = fields.classList.toggle('open');
        card.classList.toggle('selected', isOpen);
      });
    }
  }
}

function wireUi() {
  document.querySelectorAll('.tabs .tab').forEach((btn, index) => {
    btn.addEventListener('click', () => activateTab(index));
  });

  bindClick('local-analyze-btn', () => postMsg({ type: 'analyzeLocal' }));

  bindClick('gen-readme-btn', () => postMsg({ type: 'generateDoc', payload: { docType: 'readme' } }));
  bindClick('gen-arch-btn', () => postMsg({ type: 'generateDoc', payload: { docType: 'architecture' } }));
  bindClick('gen-onboarding-btn', () => postMsg({ type: 'generateDoc', payload: { docType: 'onboarding' } }));

  bindClick('refactor-btn', () => postMsg({ type: 'analyzeRefactor' }));
  bindClick('save-refactor-btn', () => {
    if (_refactorContent) postMsg({ type: 'saveDoc', payload: { filename: 'REFACTOR.md', content: _refactorContent } });
  });

  bindClick('review-pr-btn', () => {
    const diff = byId('pr-diff-input')?.value?.trim() || '';
    if (!diff) return;
    postMsg({ type: 'reviewPR', payload: { diff } });
  });
  bindClick('clear-pr-btn', () => {
    const input = byId('pr-diff-input');
    if (input) input.value = '';
  });
  bindClick('save-pr-btn', () => {
    if (_prContent) postMsg({ type: 'saveDoc', payload: { filename: 'PR-REVIEW.md', content: _prContent } });
  });

  bindClick('flow-ask-btn', () => askFlowDiagram());
  bindClick('flow-detail-close', () => closeFlowDetail());

  bindClick('clear-filter-btn', () => clearFilters());
  bindInput('depth-filter', () => applyFilters());

  bindClick('node-detail-close', () => closeNodeDetail());

  bindInput('chat-input', () => {});
  const chatInput = byId('chat-input');
  if (chatInput) chatInput.addEventListener('keydown', chatKey);

  document.querySelectorAll('.qq').forEach((chip) => {
    chip.addEventListener('click', () => {
      const input = byId('chat-input');
      if (!input) return;
      input.value = chip.dataset.q || chip.textContent || '';
      input.focus();
    });
  });

  wireProviderControls();
  activateTab(0);
}

wireUi();