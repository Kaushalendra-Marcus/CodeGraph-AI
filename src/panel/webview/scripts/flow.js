/* flow.js — Flow diagram tab logic (Mermaid rendering + tile grid) */

let _flowMap = null;

// ── Render overview grid ──────────────────────────────────────────────────

function renderFlowMap(flowMap) {
  _flowMap = flowMap;
  document.getElementById('flow-empty').style.display = 'none';
  document.getElementById('flow-ready').style.display = 'flex';

  const grid = document.getElementById('flow-grid');
  grid.innerHTML = '';

  for (const diagram of flowMap.subDiagrams) {
    const tile = document.createElement('div');
    tile.className = 'flow-tile';
    tile.innerHTML = `
      <div class="flow-tile-title">${escHtml(diagram.title)}</div>
      <div class="flow-tile-desc">${escHtml(diagram.description)}</div>
      <span class="flow-tile-badge ${escAttr(diagram.category)}">${escHtml(diagram.category)}</span>
    `;
    tile.addEventListener('click', () => openFlowDetail(diagram));
    grid.appendChild(tile);
  }
}

// ── Open detail panel ─────────────────────────────────────────────────────

function openFlowDetail(diagram) {
  document.getElementById('flow-detail-title').textContent = diagram.title;
  document.getElementById('flow-detail').classList.add('open');

  const mermaidEl = document.getElementById('flow-detail-mermaid');
  mermaidEl.innerHTML = '';
  mermaidEl.removeAttribute('data-processed');

  // Render Mermaid
  renderMermaid(diagram.mermaidCode, mermaidEl);

  // Show related files
  const filesEl = document.getElementById('flow-detail-files');
  if (diagram.relatedFiles?.length) {
    filesEl.innerHTML = '<strong style="font-weight:600">Related files:</strong><br>' +
      diagram.relatedFiles.map(f =>
        `<span class="detail-chip" style="cursor:pointer" data-fpath="${escAttr(f)}">${escHtml(f)}</span>`
      ).join('');
    filesEl.querySelectorAll('.detail-chip[data-fpath]').forEach(el => {
      el.addEventListener('click', () => postMsg({ type: 'openFile', payload: { path: el.dataset.fpath } }));
    });
  } else {
    filesEl.innerHTML = '';
  }
}

function closeFlowDetail() {
  document.getElementById('flow-detail').classList.remove('open');
}

// ── Ask custom diagram ────────────────────────────────────────────────────

function askFlowDiagram() {
  const input = document.getElementById('flow-ask-input');
  const q = input.value.trim();
  if (!q) return;
  input.value = '';
  postMsg({ type: 'generateCustomFlow', payload: { question: q } });
}

function addCustomFlowTile(diagram) {
  if (!_flowMap) return;
  _flowMap.subDiagrams.unshift(diagram);
  renderFlowMap(_flowMap);
}

// ── Mermaid rendering ─────────────────────────────────────────────────────

async function renderMermaid(code, container) {
  if (!window.mermaid) {
    container.innerHTML = `<pre style="font-size:10px;white-space:pre-wrap;word-break:break-all;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px">${escHtml(code)}</pre>`;
    return;
  }

  try {
    const id = 'mermaid-' + Date.now();
    const dark = document.body.classList.contains('vscode-dark') ||
                 document.body.classList.contains('vscode-high-contrast');

    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? 'dark' : 'default',
      themeVariables: {
        fontSize: '12px',
        fontFamily: 'var(--vscode-font-family, "Segoe UI", sans-serif)',
      },
      flowchart: { curve: 'basis', htmlLabels: true },
    });

    const { svg } = await mermaid.render(id, code);
    container.innerHTML = svg;

    // Animate edges with a stroke-dasharray trick for a draw-in effect
    const paths = container.querySelectorAll('path.flowchart-link, .edgePath path');
    paths.forEach((path, i) => {
      const len = path.getTotalLength ? path.getTotalLength() : 200;
      path.style.strokeDasharray = len;
      path.style.strokeDashoffset = len;
      path.style.transition = `stroke-dashoffset 0.5s ease ${i * 0.04}s`;
      requestAnimationFrame(() => { path.style.strokeDashoffset = '0'; });
    });
  } catch (err) {
    container.innerHTML = `
      <div style="color:#f44747;font-size:11px;margin-bottom:6px">Mermaid render error — showing raw code</div>
      <pre style="font-size:10px;white-space:pre-wrap;word-break:break-all;padding:8px;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px">${escHtml(code)}</pre>
    `;
  }
}
