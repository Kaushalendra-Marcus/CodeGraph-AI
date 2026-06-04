#!/usr/bin/env node
/**
 * scripts/build-webview.js
 *
 * Assembles the VS Code webview from separate source files:
 *   src/panel/webview/styles.css
 *   src/panel/webview/tabs/*.html
 *   src/panel/webview/scripts/graph.js
 *   src/panel/webview/scripts/flow.js
 *   src/panel/webview/scripts/messaging.js
 *   src/panel/webview/scripts/ui.js
 *
 * Output: out/webview-bundle.html
 *
 * The bundle contains two template placeholders that are replaced at
 * runtime by webview/index.ts:
 *   __CSP_SOURCE__   → webview.cspSource
 *   __ICON_URIS__    → JSON.stringify(iconUris)
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const ROOT    = path.join(__dirname, '..');
const WEBVIEW = path.join(ROOT, 'src', 'panel', 'webview');
const OUT     = path.join(ROOT, 'out');

// ── Read helpers ──────────────────────────────────────────────────────────

function read(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`[build-webview] WARNING: missing file ${filePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf8');
}

function readTab(name) {
  return read(path.join(WEBVIEW, 'tabs', name));
}

function readScript(name) {
  return read(path.join(WEBVIEW, 'scripts', name));
}

// ── Build ─────────────────────────────────────────────────────────────────

function build() {
  if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

  const css = read(path.join(WEBVIEW, 'styles.css'));

  // Tab HTML fragments
  const tabAnalyze   = readTab('analyze.html');
  const tabGraph     = readTab('graph.html');
  const tabSummary   = readTab('summary.html');
  const tabQA        = readTab('qa.html');
  const tabFlow      = readTab('flow.html');
  const tabAITools   = readTab('aitools.html');
  const tabHistory   = readTab('history.html');
  const tabSettings  = readTab('settings.html');

  // JS scripts (order matters: graph → flow → messaging → ui)
  const jsGraph     = readScript('graph.js');
  const jsFlow      = readScript('flow.js');
  const jsMessaging = readScript('messaging.js');
  const jsUI        = readScript('ui.js');

  const bundle = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RepoGraph AI</title>
<meta http-equiv="Content-Security-Policy" content="
  default-src 'none';
  img-src __CSP_SOURCE__ https: data:;
  style-src __CSP_SOURCE__ 'unsafe-inline' https://cdn.jsdelivr.net;
  script-src __CSP_SOURCE__ 'unsafe-inline' https://cdn.jsdelivr.net;
  font-src __CSP_SOURCE__ data: https://cdn.jsdelivr.net;
">
<!-- Mermaid — loaded from CDN, required for flow diagrams -->
<script src="https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js"></script>
<style>
${css}
/* ── Flow tile icon ── */
.flow-tile-icon{display:flex;align-items:center;justify-content:flex-start;margin-bottom:4px;opacity:0.9}
.flow-tile-icon svg{display:block;flex-shrink:0}
/* ── Flow detail body scrollable area ── */
#flow-detail-body{flex:1;overflow-y:auto;padding:12px 14px}
#flow-detail-body::-webkit-scrollbar{width:4px}
#flow-detail-body::-webkit-scrollbar-thumb{background:var(--vscode-panel-border);border-radius:2px}
/* ── Mermaid SVG overrides inside VS Code dark theme ── */
.mermaid svg .node rect,.mermaid svg .node circle,.mermaid svg .node polygon{
  stroke-width:1.5px!important
}
.mermaid svg .edgePath .path{stroke-width:1.5px!important}
.mermaid svg text{font-size:12px!important}
/* ── Flow ask loading state ── */
.flow-ask-input:disabled{opacity:0.5}
/* ── Summary complexity badge ── */
.complexity-badge{display:inline-block;font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;margin-left:6px;vertical-align:middle}
.complexity-low   {background:rgba(78,201,176,0.12);color:#4ec9b0}
.complexity-medium{background:rgba(220,220,170,0.12);color:#dcdcaa}
.complexity-high  {background:rgba(244,71,71,0.1);   color:#f48771}
</style>
</head>
<body>

<!-- Tab bar -->
<div class="tabs">
  <button class="tab active">Analyze</button>
  <button class="tab">Graph</button>
  <button class="tab">Summary</button>
  <button class="tab">Q&amp;A</button>
  <button class="tab">Flow</button>
  <button class="tab">AI Tools</button>
  <button class="tab">History</button>
  <button class="tab">Settings</button>
</div>

<!-- Tab screens -->
${tabAnalyze}
${tabGraph}
${tabSummary}
${tabQA}
${tabFlow}
${tabAITools}
${tabHistory}
${tabSettings}

<script>
/* ── Runtime injection ── */
const ICON_URIS = __ICON_URIS__;

/* ── Scripts (graph → flow → messaging → ui) ── */
${jsGraph}
${jsFlow}
${jsMessaging}
${jsUI}
</script>
</body>
</html>`;

  const outPath = path.join(OUT, 'webview-bundle.html');
  fs.writeFileSync(outPath, bundle, 'utf8');

  const kb = (Buffer.byteLength(bundle, 'utf8') / 1024).toFixed(1);
  console.log(`[build-webview] Built → out/webview-bundle.html (${kb} KB)`);
}

build();
