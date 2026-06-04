/* graph.js — canvas dependency graph renderer */

let canvas, ctx, canvasWrap;
let nodes = [], edges = [];
let cam = { x: 0, y: 0, scale: 1 };
let dragging = false, dragNode = null, lastMouse = { x: 0, y: 0 };
let selectedNode = null;
let graphBuilt = false;
let searchTerm = '';
let pointerState = { down: false, moved: false, startX: 0, startY: 0, node: null };
let _layoutTimer = null;

const GROUP_COLORS = [
  '#569cd6','#4ec9b0','#c586c0','#dcdcaa','#d7ba7d',
  '#ce9178','#9cdcfe','#4fc1ff','#f48771','#b5cea8','#646695'
];
const groupColorMap = {};

// ── Init ──────────────────────────────────────────────────────────────────

function initGraph(data) {
  graphBuilt = true;
  document.getElementById('graph-empty').style.display = 'none';
  document.getElementById('graph-wrap').style.display  = 'flex';

  canvas     = document.getElementById('graph-canvas');
  ctx        = canvas.getContext('2d');
  canvasWrap = document.getElementById('graph-canvas-wrap');

  const groups = [...new Set(data.nodes.map(n => n.group))];
  groups.forEach((g, i) => { groupColorMap[g] = GROUP_COLORS[i % GROUP_COLORS.length]; });

  const legEl = document.getElementById('graph-legend');
  legEl.innerHTML = groups.slice(0, 6).map(g =>
    `<div class="legend-item"><div class="legend-dot" style="background:${groupColorMap[g]}"></div>${escHtml(g)}</div>`
  ).join('');

  // Pick top 120 most-connected nodes for display
  const ranked = [...data.nodes].sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree));
  const seed   = ranked.slice(0, 60);
  const ids    = new Set(seed.map(n => n.id));

  let expanded = true;
  while (expanded && ids.size < 120) {
    expanded = false;
    for (const e of data.edges) {
      if (ids.size >= 120) break;
      if (ids.has(e.source) && !ids.has(e.target)) { ids.add(e.target); expanded = true; }
      else if (ids.has(e.target) && !ids.has(e.source)) { ids.add(e.source); expanded = true; }
    }
  }

  const topNodes = ranked.filter(n => ids.has(n.id)).slice(0, 120);
  nodes = topNodes.map((n, i) => {
    const angle = (i / topNodes.length) * Math.PI * 2;
    const r     = 80 + Math.sqrt(topNodes.length) * 18;
    return {
      ...n,
      x: Math.cos(angle) * r + (Math.random() - 0.5) * 60,
      y: Math.sin(angle) * r + (Math.random() - 0.5) * 60,
      vx: 0, vy: 0,
      r: Math.max(14, Math.min(28, 14 + n.inDegree * 2.5)),
      color: groupColorMap[n.group] || GROUP_COLORS[0],
    };
  });

  edges = data.edges.filter(e => ids.has(e.source) && ids.has(e.target));
  document.getElementById('graph-stats').textContent =
    topNodes.length + ' files · ' + edges.length + ' imports';

  for (let i = 0; i < 200; i++) tickForce();

  setupCanvasEvents();
  resizeCanvas();
  fitView();
  render();
}

// ── Force layout ──────────────────────────────────────────────────────────

function tickForce() {
  const repK = 1800, attrK = 0.06, idealLen = 120, centerK = 0.003;
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const a = nodes[i], b = nodes[j];
      const dx = b.x - a.x, dy = b.y - a.y;
      const distSq = Math.max(dx * dx + dy * dy, 1);
      const dist = Math.sqrt(distSq);
      const f = repK / distSq;
      const fx = (dx / dist) * f, fy = (dy / dist) * f;
      a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
    }
  }
  const nm = new Map(nodes.map(n => [n.id, n]));
  for (const e of edges) {
    const a = nm.get(e.source), b = nm.get(e.target);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y;
    const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const f = (dist - idealLen) / dist * attrK;
    a.vx += dx * f; a.vy += dy * f;
    b.vx -= dx * f; b.vy -= dy * f;
  }
  for (const n of nodes) {
    n.vx -= n.x * centerK; n.vy -= n.y * centerK;
    n.x += n.vx * 0.5;    n.y += n.vy * 0.5;
    n.vx *= 0.72;          n.vy *= 0.72;
  }
}

// ── Canvas events ─────────────────────────────────────────────────────────

function setupCanvasEvents() {
  canvas.onwheel = e => {
    e.preventDefault();
    const f    = e.deltaY < 0 ? 1.12 : 0.89;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    cam.x = mx - (mx - cam.x) * f;
    cam.y = my - (my - cam.y) * f;
    cam.scale = Math.max(0.15, Math.min(5, cam.scale * f));
    render();
  };

  canvas.onmousedown = e => {
    const { gx, gy } = s2g(e.offsetX, e.offsetY);
    const hit = nodes.find(n => Math.hypot(n.x - gx, n.y - gy) < n.r + 2);
    pointerState = { down: true, moved: false, startX: e.clientX, startY: e.clientY, node: hit };
    dragNode = hit; dragging = !hit; lastMouse = { x: e.clientX, y: e.clientY };
    canvas.classList.toggle('grabbing', dragging);
  };

  canvas.onmouseup = e => {
    const dist = Math.hypot(e.clientX - pointerState.startX, e.clientY - pointerState.startY);
    if (pointerState.down && !pointerState.moved && pointerState.node && dist < 5)
      selectNode(pointerState.node);
    else if (pointerState.down && !pointerState.moved && !pointerState.node && dist < 5)
      { selectedNode = null; closeNodeDetail(); }
    dragging = false; dragNode = null; pointerState.down = false;
    canvas.classList.remove('grabbing');
    render();
  };

  canvas.onmousemove = e => {
    if (pointerState.down && Math.hypot(e.clientX - pointerState.startX, e.clientY - pointerState.startY) > 4)
      pointerState.moved = true;
    if (dragging) {
      cam.x += e.clientX - lastMouse.x;
      cam.y += e.clientY - lastMouse.y;
      lastMouse = { x: e.clientX, y: e.clientY };
      render();
    } else if (dragNode) {
      const dx = (e.clientX - lastMouse.x) / cam.scale;
      const dy = (e.clientY - lastMouse.y) / cam.scale;
      dragNode.x += dx; dragNode.y += dy;
      dragNode.vx = 0;  dragNode.vy = 0;
      lastMouse = { x: e.clientX, y: e.clientY };
      render(); scheduleSaveLayout();
    } else {
      const { gx, gy } = s2g(e.offsetX, e.offsetY);
      const hit = nodes.find(n => Math.hypot(n.x - gx, n.y - gy) < n.r + 3);
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  canvas.ondblclick = e => {
    const { gx, gy } = s2g(e.offsetX, e.offsetY);
    const hit = nodes.find(n => Math.hypot(n.x - gx, n.y - gy) < n.r + 3);
    if (hit) postMsg({ type: 'openFile', payload: { path: hit.path } });
  };

  window.addEventListener('resize', () => { resizeCanvas(); render(); });
}

function s2g(sx, sy) {
  return { gx: (sx - cam.x) / cam.scale, gy: (sy - cam.y) / cam.scale };
}

function resizeCanvas() {
  if (!canvas || !canvasWrap) return false;
  const rect = canvasWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  canvas.width = rect.width; canvas.height = rect.height;
  canvas.style.width = rect.width + 'px'; canvas.style.height = rect.height + 'px';
  return true;
}

function fitView() {
  if (!nodes.length || !canvas) return;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const n of nodes) {
    minX = Math.min(minX, n.x - n.r); maxX = Math.max(maxX, n.x + n.r);
    minY = Math.min(minY, n.y - n.r); maxY = Math.max(maxY, n.y + n.r);
  }
  const pad = 40, W = canvas.width - pad * 2, H = canvas.height - pad * 2;
  const gW = maxX - minX || 1, gH = maxY - minY || 1;
  cam.scale = Math.max(0.15, Math.min(2.5, Math.min(W / gW, H / gH)));
  cam.x = pad - minX * cam.scale;
  cam.y = pad - minY * cam.scale;
  render();
}

function zoom(f) { cam.scale = Math.max(0.15, Math.min(5, cam.scale * f)); render(); }
function resetView() { fitView(); }

// ── Render ────────────────────────────────────────────────────────────────

function render() {
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(cam.x, cam.y);
  ctx.scale(cam.scale, cam.scale);

  const nm = new Map(nodes.map(n => [n.id, n]));
  const sid = selectedNode?.id;
  const connIds = new Set();
  if (sid) edges.forEach(e => {
    if (e.source === sid) connIds.add(e.target);
    if (e.target === sid) connIds.add(e.source);
  });

  // Draw edges
  for (const e of edges) {
    const a = nm.get(e.source), b = nm.get(e.target);
    if (!a || !b) continue;
    if (searchTerm && !a.label.toLowerCase().includes(searchTerm) &&
        !b.label.toLowerCase().includes(searchTerm)) continue;
    const isRelated = sid && (e.source === sid || e.target === sid);
    const dimmed    = sid && !isRelated;
    const dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) continue;
    const sx = a.x + (dx / dist) * a.r, sy = a.y + (dy / dist) * a.r;
    const ex = b.x - (dx / dist) * (b.r + 7), ey = b.y - (dy / dist) * (b.r + 7);
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = isRelated && e.source === sid ? 'rgba(86,156,214,0.85)'
      : isRelated ? 'rgba(78,201,214,0.7)'
      : dimmed    ? 'rgba(255,255,255,0.04)'
      :               'rgba(255,255,255,0.12)';
    ctx.lineWidth = isRelated ? 1.8 : dimmed ? 0.5 : 0.8;
    ctx.stroke();
    if (!dimmed) drawArrowHead(ex, ey, sx, sy, isRelated);
  }

  // Draw nodes
  for (const n of nodes) {
    const isSel = n.id === sid, isConn = connIds.has(n.id);
    const dimmed = sid && !isSel && !isConn;
    ctx.globalAlpha = searchTerm && !n.label.toLowerCase().includes(searchTerm) ? 0.15 : dimmed ? 0.25 : 1;
    ctx.shadowColor = isSel ? n.color : isConn ? n.color : '';
    ctx.shadowBlur  = isSel ? 16 : isConn ? 6 : 0;
    ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fillStyle = isSel ? n.color : n.color + '55'; ctx.fill();
    ctx.strokeStyle = n.color; ctx.lineWidth = isSel ? 2 : isConn ? 1.5 : 0.8; ctx.stroke();
    ctx.shadowBlur = 0;
    if (cam.scale > 0.45 || isSel || isConn) {
      const fs = Math.max(8, Math.min(11, 9 / cam.scale));
      ctx.font = `${isSel || isConn ? 600 : 400} ${fs}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillStyle = isSel ? '#fff' : isConn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)';
      let lbl = n.label; if (lbl.length > 16) lbl = lbl.slice(0, 14) + '…';
      ctx.fillText(lbl, n.x, n.y + n.r + fs + 2);
    }
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawArrowHead(ex, ey, fromX, fromY, highlighted) {
  const len = 8, angle = 0.45;
  const ang = Math.atan2(ey - fromY, ex - fromX);
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - len * Math.cos(ang - angle), ey - len * Math.sin(ang - angle));
  ctx.moveTo(ex, ey);
  ctx.lineTo(ex - len * Math.cos(ang + angle), ey - len * Math.sin(ang + angle));
  ctx.strokeStyle = highlighted ? 'rgba(86,156,214,0.85)' : 'rgba(255,255,255,0.18)';
  ctx.lineWidth   = highlighted ? 1.8 : 0.8;
  ctx.stroke();
}

// ── Node selection ────────────────────────────────────────────────────────

function selectNode(node) {
  selectedNode = node;
  const detail = document.getElementById('node-detail');
  detail.classList.add('open');
  document.getElementById('node-detail-filename').textContent = node.label;

  const nm = new Map(nodes.map(n => [n.id, n]));
  const importing  = edges.filter(e => e.source === node.id).map(e => nm.get(e.target)).filter(Boolean);
  const importedBy = edges.filter(e => e.target === node.id).map(e => nm.get(e.source)).filter(Boolean);

  let html = `<div style="font-family:monospace;font-size:10px;color:var(--vscode-descriptionForeground);word-break:break-all;margin-bottom:6px">${escHtml(node.path)}</div>`;
  html += `<div style="display:flex;gap:10px;margin-bottom:8px;font-size:11px;color:var(--vscode-descriptionForeground)">
    <span>imports <b>${importing.length}</b></span>
    <span>used by <b>${importedBy.length}</b></span>
    <span>${escHtml(node.language)}</span>
  </div>`;

  if (window.fileSummaryMap && fileSummaryMap[node.path]) {
    const s = fileSummaryMap[node.path];
    html += `<div class="detail-label">Purpose</div><div style="font-size:11px;line-height:1.6">${escHtml(s.purpose)}</div>`;
  }
  if (importing.length) {
    html += `<div class="detail-label">Imports (${importing.length})</div>`;
    html += importing.slice(0, 12).map(n =>
      `<span class="detail-chip" data-nid="${escAttr(n.id)}">${escHtml(n.label)}</span>`
    ).join('');
  }
  if (importedBy.length) {
    html += `<div class="detail-label">Used By (${importedBy.length})</div>`;
    html += importedBy.slice(0, 12).map(n =>
      `<span class="detail-chip" data-nid="${escAttr(n.id)}">${escHtml(n.label)}</span>`
    ).join('');
  }
  if (node.exports?.length) {
    html += `<div class="detail-label">Exports</div>`;
    html += node.exports.map(e => `<span class="detail-chip" style="cursor:default">${escHtml(e)}</span>`).join('');
  }
  html += `<button class="btn btn-secondary open-file-btn" style="margin-top:10px;width:100%;justify-content:center" data-fpath="${escAttr(node.path)}">Open File</button>`;

  const body = document.getElementById('node-detail-body');
  body.innerHTML = html;
  body.querySelectorAll('.detail-chip[data-nid]').forEach(el => {
    el.addEventListener('click', () => {
      const t = nodes.find(x => x.id === el.dataset.nid);
      if (t) { selectNode(t); render(); }
    });
  });
  body.querySelector('.open-file-btn')?.addEventListener('click', function() {
    postMsg({ type: 'openFile', payload: { path: this.dataset.fpath } });
  });
  render();
}

function closeNodeDetail() {
  document.getElementById('node-detail').classList.remove('open');
  selectedNode = null; render();
}

function graphSearch(val) { searchTerm = val.toLowerCase().trim(); render(); }

// ── Layout persistence ────────────────────────────────────────────────────

function scheduleSaveLayout() {
  clearTimeout(_layoutTimer);
  _layoutTimer = setTimeout(() => {
    const pos = nodes.map(n => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) }));
    postMsg({ type: 'saveLayout', payload: { positions: pos } });
  }, 800);
}

function applyLayout(positions) {
  if (!positions?.length || !nodes.length) return;
  const pm = new Map(positions.map(p => [p.id, p]));
  nodes.forEach(n => { const s = pm.get(n.id); if (s) { n.x = s.x; n.y = s.y; n.vx = 0; n.vy = 0; } });
  render();
}

// ── Filter panel ──────────────────────────────────────────────────────────

function toggleFilterPanel() {
  const p = document.getElementById('filter-panel');
  p.style.display = p.style.display === 'none' || !p.style.display ? 'block' : 'none';
}

function applyFilters() {
  const de = document.getElementById('depth-filter');
  if (de) {
    const v = parseInt(de.value);
    const dv = document.getElementById('depth-val');
    if (dv) dv.textContent = v >= 6 ? 'All' : String(v);
  }
  render();
}

function clearFilters() {
  const de = document.getElementById('depth-filter');
  if (de) de.value = '6';
  const dv = document.getElementById('depth-val');
  if (dv) dv.textContent = 'All';
  render();
}
