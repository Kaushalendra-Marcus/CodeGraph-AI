export function getWebviewContent(params: { cspSource: string; iconUris: Record<string, string> }): string {
  const { cspSource, iconUris } = params;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>RepoGraph AI</title>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${cspSource} https: data:; style-src ${cspSource} 'unsafe-inline'; script-src ${cspSource} 'unsafe-inline'; font-src ${cspSource} data:;">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{
  font-family:var(--vscode-font-family,'Segoe UI',sans-serif);
  font-size:12px;
  background:var(--vscode-editor-background);
  color:var(--vscode-editor-foreground);
  height:100vh;display:flex;flex-direction:column;overflow:hidden;
}
.tabs{
  display:flex;border-bottom:1px solid var(--vscode-panel-border);
  flex-shrink:0;background:var(--vscode-sideBar-background);
}
.tab{
  flex:1;padding:8px 2px;font-size:10.5px;background:none;border:none;
  color:var(--vscode-descriptionForeground);cursor:pointer;
  border-bottom:2px solid transparent;font-family:inherit;
  letter-spacing:0.03em;transition:color 0.15s,border-color 0.15s;
  display:inline-flex;align-items:center;justify-content:center;gap:5px;
}
.tab.active{color:var(--vscode-editor-foreground);border-bottom-color:var(--vscode-button-background)}
.tab:hover:not(.active){color:var(--vscode-editor-foreground)}
.tab-icon,.btn-icon,.inline-icon,.empty-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;line-height:0}
.tab-icon .icon-img,.btn-icon .icon-img,.inline-icon .icon-img,.empty-icon .icon-img{display:block;object-fit:contain;opacity:0.95}
.empty-icon .icon-img{width:36px;height:36px}
.tab-icon .icon-img,.btn-icon .icon-img{width:14px;height:14px}
.inline-icon .icon-img{width:12px;height:12px}
body.vscode-dark .icon-img, body.vscode-high-contrast .icon-img{filter:invert(1) brightness(2) saturate(0) contrast(1.1)}
body.vscode-light .icon-img{filter:invert(0) brightness(0.32) saturate(0)}
.empty{display:flex;flex:1;flex-direction:column;align-items:center;justify-content:center;gap:6px;color:var(--vscode-descriptionForeground);padding:20px;text-align:center;width:100%}
.screen{display:none;flex:1;flex-direction:column;overflow:hidden;min-height:0}
.screen.active{display:flex}
.scroll{overflow-y:auto;flex:1;padding:10px}
.scroll::-webkit-scrollbar{width:4px}
.scroll::-webkit-scrollbar-thumb{background:var(--vscode-panel-border);border-radius:2px}

/* Forms */
label{font-size:11px;color:var(--vscode-descriptionForeground);display:block;margin-bottom:3px;margin-top:10px}
label:first-child{margin-top:0}
input,select,textarea{
  width:100%;background:var(--vscode-input-background);
  border:1px solid var(--vscode-input-border,#555);
  border-radius:3px;padding:5px 7px;color:var(--vscode-input-foreground);
  font-size:11.5px;font-family:inherit;outline:none;
}
input:focus,select:focus,textarea:focus{border-color:var(--vscode-button-background)}
input[type=password]{font-family:monospace;letter-spacing:0.05em}

.btn{
  padding:5px 12px;background:var(--vscode-button-background);
  border:none;border-radius:3px;color:var(--vscode-button-foreground);
  font-size:11.5px;cursor:pointer;font-family:inherit;font-weight:600;
  transition:opacity 0.15s;display:inline-flex;align-items:center;gap:5px;
}
.btn:hover{opacity:0.85}
.btn:disabled{opacity:0.4;cursor:not-allowed}
.btn-secondary{
  background:var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);
  color:var(--vscode-editor-foreground);font-weight:500;
}
.btn-secondary:hover{background:var(--vscode-list-hoverBackground);opacity:1}
.btn-sm{padding:3px 8px;font-size:11px}
.btn-block{width:100%;justify-content:center}

/* Cards */
.card{
  background:var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);
  border-radius:5px;padding:9px 11px;margin-bottom:8px;
}
.card-title{font-size:11.5px;font-weight:600;margin-bottom:4px}
.card-body{font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.65}

.alert{
  padding:7px 9px;border-radius:3px;font-size:11px;
  margin-bottom:8px;border-left:3px solid;line-height:1.5;
}
.alert-error{background:rgba(244,71,71,0.08);border-color:#f44747;color:#f44747}
.alert-success{background:rgba(78,201,176,0.08);border-color:#4ec9b0;color:#4ec9b0}
.alert-info{background:rgba(86,156,214,0.08);border-color:#569cd6;color:#569cd6}

.badge{display:inline-block;font-size:9.5px;font-weight:700;padding:1px 6px;border-radius:10px}
.badge-free{background:rgba(78,201,176,0.12);color:#4ec9b0}
.badge-paid{background:rgba(220,220,170,0.12);color:#dcdcaa}

/* Progress */
.progress-wrap{padding:12px 0}
.progress-bar-outer{height:3px;background:var(--vscode-panel-border);border-radius:2px;overflow:hidden;margin:8px 0 5px}
.progress-bar-inner{height:100%;background:var(--vscode-button-background);border-radius:2px;transition:width 0.4s ease}
.progress-steps{display:flex;justify-content:space-between;font-size:9.5px}
.progress-steps span{color:var(--vscode-panel-border)}
.progress-steps span.done{color:#4ec9b0}
.progress-steps span.active{color:var(--vscode-button-background)}

/* Analyze screen */
.source-tabs{display:flex;gap:6px;margin-bottom:12px}
.source-tab{
  flex:1;padding:8px;text-align:center;border-radius:5px;cursor:pointer;
  border:1px solid var(--vscode-panel-border);font-size:11.5px;font-weight:600;
  color:var(--vscode-descriptionForeground);background:transparent;display:inline-flex;align-items:center;justify-content:center;gap:6px;
  transition:all 0.15s;
}
.source-tab.active{
  border-color:var(--vscode-button-background);
  background:rgba(0,120,212,0.08);
  color:var(--vscode-editor-foreground);
}
.source-pane{display:none}
.source-pane.active{display:block}

.example-btn{
  display:block;width:100%;text-align:left;background:var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);border-radius:3px;padding:4px 8px;
  font-size:10.5px;font-family:monospace;color:var(--vscode-descriptionForeground);
  cursor:pointer;margin-bottom:4px;transition:border-color 0.15s;
}
.example-btn:hover{border-color:var(--vscode-button-background);color:var(--vscode-editor-foreground)}

/* ══════════════════════════════════════════════════
   GRAPH 
══════════════════════════════════════════════════ */
#graph-wrap{display:flex;flex-direction:column;height:100%;position:relative}

.graph-toolbar{
  display:flex;align-items:center;gap:6px;padding:5px 8px;
  border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0;
  flex-wrap:wrap;
}
.graph-toolbar input{width:120px;flex:0 0 auto;padding:3px 6px;font-size:11px}
.zoom-btns{display:flex;gap:2px}
.zoom-btn{
  width:22px;height:22px;display:flex;align-items:center;justify-content:center;
  background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);
  border-radius:3px;cursor:pointer;font-size:13px;color:var(--vscode-editor-foreground);
  font-family:monospace;flex-shrink:0;
}
.zoom-btn:hover{background:var(--vscode-list-hoverBackground)}
.legend{display:flex;gap:6px;flex-wrap:wrap;flex:1}
.legend-item{display:flex;align-items:center;gap:3px;font-size:10px;color:var(--vscode-descriptionForeground)}
.legend-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.graph-stats{font-size:10px;color:var(--vscode-descriptionForeground)}

#graph-canvas-wrap{flex:1;position:relative;overflow:hidden;min-height:0}
#graph-canvas{position:absolute;top:0;left:0;cursor:grab}
#graph-canvas.grabbing{cursor:grabbing}

/* Node detail panel */
#node-detail{
  position:absolute;right:0;top:0;bottom:0;width:200px;
  background:var(--vscode-sideBar-background);
  border-left:1px solid var(--vscode-panel-border);
  font-size:11px;overflow-y:auto;display:none;
  flex-direction:column;
}
#node-detail.open{display:flex}
#node-detail-header{
  padding:8px 10px;border-bottom:1px solid var(--vscode-panel-border);
  display:flex;align-items:flex-start;justify-content:space-between;gap:6px;
}
#node-detail-filename{
  font-weight:700;font-size:12px;word-break:break-all;
  font-family:monospace;color:var(--vscode-editor-foreground);
}
#node-detail-close{
  cursor:pointer;color:var(--vscode-descriptionForeground);flex-shrink:0;
  background:none;border:none;font-size:14px;line-height:1;
}
#node-detail-body{padding:8px 10px;overflow-y:auto;flex:1}
.detail-label{
  font-size:9.5px;text-transform:uppercase;letter-spacing:0.08em;
  font-weight:700;color:var(--vscode-descriptionForeground);
  margin-top:10px;margin-bottom:4px;
}
.detail-label:first-child{margin-top:0}
.detail-chip{
  display:inline-block;background:var(--vscode-editor-background);
  border:1px solid var(--vscode-panel-border);border-radius:3px;
  padding:2px 5px;font-size:10px;font-family:monospace;
  margin:2px 2px 0 0;cursor:pointer;color:var(--vscode-editor-foreground);
}
.detail-chip:hover{border-color:var(--vscode-button-background)}
.detail-file-path{
  font-family:monospace;font-size:10px;
  color:var(--vscode-descriptionForeground);word-break:break-all;
  margin-bottom:6px;
}
.open-file-btn{
  margin-top:10px;width:100%;justify-content:center;
  padding:5px;font-size:11px;
}

/* Graph empty state */
#graph-empty{
  flex:1;display:flex;flex-direction:column;align-items:center;
  justify-content:center;gap:6px;color:var(--vscode-descriptionForeground);
  padding:20px;text-align:center;
}
.empty-icon{width:42px;height:42px;margin:0 auto 6px}
.empty-title{font-size:13px;font-weight:600;color:var(--vscode-editor-foreground)}
.empty-sub{font-size:11px;line-height:1.65;max-width:220px}

/* Summary */
.section-hdr{
  font-size:9.5px;text-transform:uppercase;letter-spacing:0.1em;
  font-weight:700;color:var(--vscode-descriptionForeground);
  margin:12px 0 6px;
}
.section-hdr:first-child{margin-top:0}
.chip{
  display:inline-block;background:var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);border-radius:10px;
  padding:2px 8px;font-size:10.5px;margin:2px 2px 0 0;
}
.file-card{
  background:var(--vscode-sideBar-background);
  border:1px solid var(--vscode-panel-border);
  border-radius:4px;padding:8px 10px;margin-bottom:6px;cursor:pointer;
  transition:border-color 0.15s;
}
.file-card:hover{border-color:var(--vscode-button-background)}
.file-card-path{font-family:monospace;font-size:10.5px;color:#569cd6;margin-bottom:3px}
.file-card-desc{font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.6}

/* Q&A */
.chat-history{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px;min-height:0}
.chat-history::-webkit-scrollbar{width:3px}
.chat-msg{display:flex;gap:8px;align-items:center}
.av{
  width:20px;height:20px;border-radius:4px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
  font-size:9px;font-weight:700;margin-top:0;
  border:1px solid rgba(255,255,255,0.14);
}
.av-user{background:rgba(86,156,214,0.2);color:#569cd6}
.av-ai{background:rgba(78,201,176,0.15);color:#4ec9b0}
.bubble{
  background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);
  border-radius:5px;padding:7px 9px;font-size:11.5px;line-height:1.65;flex:1;
  white-space:pre-wrap;word-break:break-word;
}
.bubble.user{background:rgba(86,156,214,0.06);border-color:rgba(86,156,214,0.25)}
.thinking-dots{display:flex;gap:3px;padding:3px 0}
.thinking-dots span{
  width:5px;height:5px;border-radius:50%;background:var(--vscode-descriptionForeground);
  animation:dpulse 1.2s ease-in-out infinite;
}
.thinking-dots span:nth-child(2){animation-delay:0.2s}
.thinking-dots span:nth-child(3){animation-delay:0.4s}
@keyframes dpulse{0%,80%,100%{opacity:0.3;transform:scale(0.8)}40%{opacity:1;transform:scale(1)}}

.chat-footer{padding:7px;border-top:1px solid var(--vscode-panel-border);flex-shrink:0}
.quick-qs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px}
.qq{
  background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);
  border-radius:10px;padding:3px 8px;font-size:10px;color:var(--vscode-descriptionForeground);
  cursor:pointer;
}
.qq:hover{border-color:var(--vscode-button-background);color:var(--vscode-editor-foreground)}
.chat-row{display:flex;gap:5px}
.chat-input{
  flex:1;resize:none;min-height:32px;max-height:80px;
  line-height:1.4;font-size:12px;
}

/* Settings */
.provider-card{
  background:var(--vscode-sideBar-background);border:1px solid var(--vscode-panel-border);
  border-radius:5px;padding:8px 10px;margin-bottom:6px;cursor:pointer;
  transition:border-color 0.15s;
}
.provider-card:hover,.provider-card.selected{border-color:var(--vscode-button-background)}
.provider-card.selected{background:rgba(0,120,212,0.05)}
.provider-hdr{display:flex;align-items:center;gap:7px}
.p-icon{
  width:22px;height:22px;border-radius:4px;display:flex;align-items:center;
  justify-content:center;font-size:11px;font-weight:700;font-family:monospace;flex-shrink:0;
}
.p-name{font-size:12px;font-weight:600;flex:1}
.provider-fields{display:none;margin-top:8px;padding-top:8px;border-top:1px solid var(--vscode-panel-border)}
.provider-fields.open{display:block}
.model-row{display:flex;gap:6px;align-items:center}
.model-row select,.model-row input{flex:1}

/* History */
.history-row{display:flex;justify-content:space-between;align-items:center;gap:10px}
.history-meta{flex:1;min-width:0}
.history-actions{display:flex;gap:6px;align-items:center}
</style>
</head>
<body>

<div class="tabs">
  <button class="tab active" onclick="showTab('analyze')">Analyze</button>
  <button class="tab" onclick="showTab('graph')">Graph</button>
  <button class="tab" onclick="showTab('summary')">Summary</button>
  <button class="tab" onclick="showTab('qa')">Q&amp;A</button>
  <button class="tab" onclick="showTab('history')">History</button>
  <button class="tab" data-tab="settings" onclick="showTab('settings')">Settings</button>
</div>

<!-- ═══════════════════════════════════════
     ANALYZE
═══════════════════════════════════════ -->
<div id="tab-analyze" class="screen active">
  <div class="scroll">
    <div id="analyze-alert"></div>

    <div class="source-tabs">
      <button class="source-tab active" id="src-local-btn" onclick="switchSource('local')"><span class="tab-icon" data-icon="local-workspace.svg"></span> Local Workspace</button>
    </div>

    <!-- LOCAL -->
    <div class="source-pane active" id="pane-local">
      <div class="card" id="workspace-info-card">
        <div class="card-title" id="ws-name">No workspace open</div>
        <div class="card-body" id="ws-sub">Open a folder in VS Code to analyze your local project</div>
      </div>
      <button class="btn btn-block" id="local-analyze-btn" onclick="analyzeLocal()" style="margin-bottom:10px">
        <span class="btn-icon" data-icon="analyze-workspace.svg"></span> Analyze Current Workspace
      </button>
      <div style="font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.7">
        Reads all code files from your workspace. Skips <code>node_modules</code>, <code>dist</code>, <code>.git</code> etc. automatically. Click a file in the graph to open it directly.
      </div>
    </div>

    <!-- PROGRESS -->
    <div id="progress-wrap" style="display:none" class="progress-wrap">
      <div class="progress-bar-outer">
        <div class="progress-bar-inner" id="pbar" style="width:8%"></div>
      </div>
      <div id="progress-msg" style="font-size:11px;color:var(--vscode-descriptionForeground)">Starting...</div>
      <div class="progress-steps" style="margin-top:4px">
        <span id="ps1">1.Fetch</span>
        <span id="ps2">2.Graph</span>
        <span id="ps3">3.Summary</span>
        <span id="ps4">4.Files</span>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════
     GRAPH
═══════════════════════════════════════ -->
<div id="tab-graph" class="screen">

  <div id="graph-empty" style="display:flex">
    <div class="empty-icon" data-icon="graph-empty.svg"></div>
    <div class="empty-title">Dependency Graph</div>
    <div class="empty-sub">Analyze a project to see how files connect to each other with arrows showing imports</div>
  </div>

  <div id="graph-wrap" style="display:none;flex:1;flex-direction:column;min-height:0">

    <div class="graph-toolbar">
      <input type="text" id="graph-search" placeholder="Search file..." oninput="graphSearch(this.value)" style="flex:0 0 130px">
      <div class="zoom-btns">
        <div class="zoom-btn" onclick="zoom(1.25)" title="Zoom in">+</div>
        <div class="zoom-btn" onclick="zoom(0.8)" title="Zoom out">-</div>
        <div class="zoom-btn" onclick="resetView()" title="Fit all">⤢</div>
      </div>
      <div class="legend" id="graph-legend"></div>
      <div class="graph-stats" id="graph-stats"></div>
    </div>

    <div id="graph-canvas-wrap">
      <canvas id="graph-canvas"></canvas>

      <!-- Node detail side panel -->
      <div id="node-detail">
        <div id="node-detail-header">
          <div id="node-detail-filename"></div>
          <button id="node-detail-close" onclick="closeNodeDetail()">Close</button>
        </div>
        <div id="node-detail-body"></div>
      </div>
    </div>

  </div>
</div>

<!-- ═══════════════════════════════════════
     SUMMARY
═══════════════════════════════════════ -->
<div id="tab-summary" class="screen">
  <div id="summary-empty" class="empty" style="display:flex">
    <div class="empty-icon" data-icon="summary-empty.svg"></div>
    <div class="empty-title">No Summary Yet</div>
    <div class="empty-sub">Analyze a project first to see AI-generated summaries</div>
  </div>
  <div id="summary-ready" class="scroll" style="display:none">
    <div class="section-hdr">Overview</div>
    <div class="card"><div class="card-title" id="s-name"></div><div class="card-body" id="s-overview"></div></div>
    <div class="section-hdr">Architecture</div>
    <div class="card"><div class="card-body" id="s-arch"></div></div>
    <div class="section-hdr">Tech Stack</div>
    <div id="s-tech" style="margin-bottom:8px"></div>
    <div class="section-hdr">Key Modules</div>
    <div id="s-modules"></div>
    <div class="section-hdr">Entry Points</div>
    <div id="s-entries" style="margin-bottom:8px;font-family:monospace;font-size:11px"></div>
    <div class="section-hdr">File Summaries <span id="s-file-count" style="font-weight:400;text-transform:none;letter-spacing:0;font-size:10px"></span></div>
    <div id="s-files"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════
     Q&A
═══════════════════════════════════════ -->
<div id="tab-qa" class="screen">
  <div id="qa-empty" class="empty" style="display:flex">
    <div class="empty-icon" data-icon="qa-empty.svg"></div>
    <div class="empty-title">Q&amp;A Not Ready</div>
    <div class="empty-sub">Analyze a project first, then ask anything about the codebase</div>
  </div>
  <div id="qa-ready" style="display:none;flex-direction:column;height:100%;min-height:0;flex:1">
    <div class="chat-history" id="chat-history"></div>
    <div class="chat-footer">
      <div class="quick-qs">
        <span class="qq" onclick="askQuick('What does this project do?')">What does it do?</span>
        <span class="qq" onclick="askQuick('Where is the entry point?')">Entry point?</span>
        <span class="qq" onclick="askQuick('How is authentication handled?')">Auth?</span>
        <span class="qq" onclick="askQuick('What are the main modules?')">Key modules?</span>
        <span class="qq" onclick="askQuick('How do I run this project locally?')">How to run?</span>
        <span class="qq" onclick="askQuick('What databases or external services are used?')">DB/Services?</span>
      </div>
      <div class="chat-row">
        <textarea class="chat-input" id="chat-input"
          placeholder="Ask anything about the codebase..." rows="1"
          onkeydown="chatKey(event)"></textarea>
        <button class="btn btn-sm" onclick="sendQ()" style="align-self:flex-end">↑</button>
      </div>
    </div>
  </div>
</div>

<!-- ═══════════════════════════════════════
     HISTORY
═══════════════════════════════════════ -->
<div id="tab-history" class="screen">
  <div id="history-empty" class="empty" style="display:flex">
    <div class="empty-icon" data-icon="graph-empty.svg"></div>
    <div class="empty-title">No History</div>
    <div class="empty-sub">Analyze a project to save it to history</div>
  </div>
  <div id="history-ready" class="scroll" style="display:none">
    <div style="font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.65;margin-bottom:8px">
      Recent analyses are automatically saved. Click a row to restore, or use delete to remove.
    </div>
    <div id="history-list"></div>
  </div>
</div>

<!-- ═══════════════════════════════════════
     SETTINGS
═══════════════════════════════════════ -->
<div id="tab-settings" class="screen">
  <div class="scroll">
    <div id="settings-alert"></div>
    <div style="font-size:11.5px;font-weight:600;margin-bottom:6px">AI Provider</div>
    <div style="font-size:11px;color:var(--vscode-descriptionForeground);margin-bottom:10px;line-height:1.65">
      Keys stored in VS Code's encrypted SecretStorage — never sent to any server except the AI provider you choose.
    </div>

    <!-- GROQ -->
    <div class="provider-card" id="pc-groq" onclick="selProv('groq')">
      <div class="provider-hdr">
        <div class="p-icon" style="background:#0a2a1e;color:#4ec9b0">G</div>
        <div class="p-name">Groq</div>
        <span class="badge badge-free">FREE</span>
      </div>
      <div class="provider-fields" id="pf-groq">
        <label>API Key</label><input id="key-groq" type="password" placeholder="gsk_...">
        <label>Model</label>
        <div class="model-row">
        <select id="model-groq" onchange="toggleCustomModel('groq')">
          <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (recommended)</option>
          <option value="mixtral-8x7b-32768">mixtral-8x7b-32768</option>
          <option value="gemma2-9b-it">gemma2-9b-it</option>
          <option value="__custom__">Other</option>
        </select>
        <input id="custom-model-groq" type="text" placeholder="Type custom model" style="display:none">
        </div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:8px">
          <button class="btn btn-sm" onclick="saveProv('groq')">Save</button>
          <a href="https://console.groq.com/keys" style="font-size:10.5px;color:#569cd6;text-decoration:none">Get free key ↗</a>
        </div>
      </div>
    </div>

    <!-- OLLAMA -->
    <div class="provider-card" id="pc-ollama" onclick="selProv('ollama')">
      <div class="provider-hdr">
        <div class="p-icon" style="background:#2a1f0e;color:#dcdcaa">O</div>
        <div class="p-name">Ollama (Local)</div>
        <span class="badge badge-free">100% FREE</span>
      </div>
      <div class="provider-fields" id="pf-ollama">
        <div class="alert alert-info" style="margin-bottom:6px">Runs locally — no API key needed. Install from ollama.com first.</div>
        <label>Model</label><input id="model-ollama" type="text" value="llama3.2" placeholder="llama3.2">
        <label>Base URL</label><input id="baseurl-ollama" type="text" value="http://localhost:11434">
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm" onclick="saveProv('ollama')">Save</button>
          <a href="https://ollama.com" style="font-size:10.5px;color:#569cd6;text-decoration:none">Download Ollama ↗</a>
        </div>
      </div>
    </div>

    <!-- GEMINI -->
    <div class="provider-card" id="pc-gemini" onclick="selProv('gemini')">
      <div class="provider-hdr">
        <div class="p-icon" style="background:#1c2a3e;color:#9cdcfe">G</div>
        <div class="p-name">Google Gemini</div>
        <span class="badge badge-free">FREE tier</span>
      </div>
      <div class="provider-fields" id="pf-gemini">
        <label>API Key</label><input id="key-gemini" type="password" placeholder="AIza...">
        <label>Model</label>
        <div class="model-row">
        <select id="model-gemini" onchange="toggleCustomModel('gemini')">
          <option value="gemini-1.5-flash">gemini-1.5-flash (free)</option>
          <option value="gemini-1.5-pro">gemini-1.5-pro</option>
          <option value="__custom__">Other</option>
        </select>
        <input id="custom-model-gemini" type="text" placeholder="Type custom model" style="display:none">
        </div>
        <div style="margin-top:8px;display:flex;gap:8px;align-items:center">
          <button class="btn btn-sm" onclick="saveProv('gemini')">Save</button>
          <a href="https://aistudio.google.com/app/apikey" style="font-size:10.5px;color:#569cd6;text-decoration:none">Get free key ↗</a>
        </div>
      </div>
    </div>

    <!-- ANTHROPIC -->
    <div class="provider-card" id="pc-anthropic" onclick="selProv('anthropic')">
      <div class="provider-hdr">
        <div class="p-icon" style="background:#2d1f4e;color:#c586c0">A</div>
        <div class="p-name">Anthropic Claude</div>
        <span class="badge badge-paid">PAID</span>
      </div>
      <div class="provider-fields" id="pf-anthropic">
        <label>API Key</label><input id="key-anthropic" type="password" placeholder="sk-ant-...">
        <label>Model</label>
        <div class="model-row">
        <select id="model-anthropic" onchange="toggleCustomModel('anthropic')">
          <option value="claude-haiku-4-5-20251001">claude-haiku (fastest)</option>
          <option value="claude-sonnet-4-6">claude-sonnet (best)</option>
          <option value="__custom__">Other</option>
        </select>
        <input id="custom-model-anthropic" type="text" placeholder="Type custom model" style="display:none">
        </div>
        <div style="margin-top:8px"><button class="btn btn-sm" onclick="saveProv('anthropic')">Save</button></div>
      </div>
    </div>

    <!-- OPENAI -->
    <div class="provider-card" id="pc-openai" onclick="selProv('openai')">
      <div class="provider-hdr">
        <div class="p-icon" style="background:#1a2d1a;color:#4ec9b0">O</div>
        <div class="p-name">OpenAI</div>
        <span class="badge badge-paid">PAID</span>
      </div>
      <div class="provider-fields" id="pf-openai">
        <label>API Key</label><input id="key-openai" type="password" placeholder="sk-...">
        <label>Model</label>
        <div class="model-row">
        <select id="model-openai" onchange="toggleCustomModel('openai')">
          <option value="gpt-4o-mini">gpt-4o-mini (cheapest)</option>
          <option value="gpt-4o">gpt-4o</option>
          <option value="__custom__">Other</option>
        </select>
        <input id="custom-model-openai" type="text" placeholder="Type custom model" style="display:none">
        </div>
        <div style="margin-top:8px"><button class="btn btn-sm" onclick="saveProv('openai')">Save</button></div>
      </div>
    </div>

  </div>
</div>

<script>
/* ══════════════════════════════════════════════════════════
   VSCODE API
══════════════════════════════════════════════════════════ */
let vscode;
const ICON_URIS = ${JSON.stringify(iconUris)};

function hydrateIcons() {
  document.querySelectorAll('[data-icon]').forEach((node) => {
    const iconName = node.getAttribute('data-icon');
    const iconUri = iconName ? ICON_URIS[iconName] : undefined;
    if (!iconUri) return;
    const existing = node.querySelector('img.icon-img');
    if (existing && existing.getAttribute('src') === iconUri) {
      return;
    }
    const img = document.createElement('img');
    img.className = 'icon-img';
    img.src = iconUri;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.onerror = () => {
      node.innerHTML = '';
    };
    node.innerHTML = '';
    node.appendChild(img);
  });
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function escAttr(s) {
  return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
}

try {
  vscode = acquireVsCodeApi();
} catch (e) {
}

// Helper to safely encode path for onclick handlers
function openFileHandler(path) {
  if (!vscode) { return; }
  vscode.postMessage({type:'openFile',payload:{path}});
}

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */
const TAB_NAMES = ['analyze','graph','summary','qa','history','settings'];
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', TAB_NAMES[i]===name));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if (name==='graph' && graphBuilt) {
    // Graph can be initialized while hidden; force canvas resize after tab becomes visible.
    setTimeout(() => {
      if (resizeCanvas()) {
        fitView();
      }
      render();
    }, 60);
  }
}

/* ══════════════════════════════════════════════════════════
   SOURCE SWITCHING
══════════════════════════════════════════════════════════ */
function switchSource(src) {
  // Only local is supported now
  if (src === 'local') return;
}

/* ══════════════════════════════════════════════════════════
   ANALYZE
══════════════════════════════════════════════════════════ */
function analyzeLocal() {
  clearAlert('analyze');
  setAnalyzing(true);
  if (!vscode) { return; }
  vscode.postMessage({ type:'analyzeLocal' });
}

function setAnalyzing(on) {
  document.getElementById('local-analyze-btn').disabled = on;
  document.getElementById('progress-wrap').style.display = on ? 'block' : 'none';
  if (on) setProgress(1, 8, 'Starting...');
}

function setProgress(step, pct, msg) {
  document.getElementById('pbar').style.width = pct+'%';
  document.getElementById('progress-msg').textContent = msg;
  ['ps1','ps2','ps3','ps4'].forEach((id,i) => {
    const el = document.getElementById(id);
    el.className = (i+1 < step) ? 'done' : (i+1===step) ? 'active' : '';
  });
}

/* ══════════════════════════════════════════════════════════
   GRAPH ENGINE
══════════════════════════════════════════════════════════ */
let canvas, ctx, canvasWrap;
let nodes = [], edges = [];
let cam = { x:0, y:0, scale:1 };
let dragging = false, dragNode = null, lastMouse = {x:0,y:0};
let selectedNode = null;
let graphBuilt = false;
let animFrame = null;
let searchTerm = '';
const fileSummaryMap = {};
let pointerState = { down: false, moved: false, startX: 0, startY: 0, node: null };

// Group → color mapping
const GROUP_COLORS = [
  '#569cd6','#4ec9b0','#c586c0','#dcdcaa',
  '#d7ba7d','#ce9178','#9cdcfe','#4fc1ff',
  '#f48771','#b5cea8','#646695'
];
const groupColorMap = {};

function initGraph(data) {
  graphBuilt = true;
  document.getElementById('graph-empty').style.display='none';
  document.getElementById('graph-wrap').style.display='flex';

  canvas = document.getElementById('graph-canvas');
  ctx = canvas.getContext('2d');
  canvasWrap = document.getElementById('graph-canvas-wrap');

  // Build group→color
  const groups = [...new Set(data.nodes.map(n=>n.group))];
  groups.forEach((g,i)=>{ groupColorMap[g] = GROUP_COLORS[i % GROUP_COLORS.length]; });

  // Build legend (top 5 groups)
  const legEl = document.getElementById('graph-legend');
  legEl.innerHTML = groups.slice(0,6).map(g=>
    \`<div class="legend-item"><div class="legend-dot" style="background:\${groupColorMap[g]}"></div>\${g}</div>\`
  ).join('');

  // Cap at 120 nodes for performance
  const rankedNodes = [...data.nodes]
    .sort((a,b)=>(b.inDegree+b.outDegree)-(a.inDegree+a.outDegree))
  const seedNodes = rankedNodes.slice(0,60);
  const nodeIds = new Set(seedNodes.map(n=>n.id));

  // Expand from the most important nodes so the visible subgraph stays connected.
  let expanded = true;
  while (expanded && nodeIds.size < 120) {
    expanded = false;
    for (const edge of data.edges) {
      if (nodeIds.size >= 120) break;
      if (nodeIds.has(edge.source) && !nodeIds.has(edge.target)) {
        nodeIds.add(edge.target);
        expanded = true;
      } else if (nodeIds.has(edge.target) && !nodeIds.has(edge.source)) {
        nodeIds.add(edge.source);
        expanded = true;
      }
    }
  }

  const topNodes = rankedNodes.filter(n => nodeIds.has(n.id)).slice(0,120);

  // Initialize positions (random, will be force-settled)
  nodes = topNodes.map((n,i)=>{
    const angle = (i / topNodes.length) * Math.PI * 2;
    const r = 80 + Math.sqrt(topNodes.length) * 18;
    return {
      ...n,
      x: Math.cos(angle)*r + (Math.random()-0.5)*60,
      y: Math.sin(angle)*r + (Math.random()-0.5)*60,
      vx:0, vy:0,
      r: Math.max(14, Math.min(28, 14 + n.inDegree*2.5)),
      color: groupColorMap[n.group] || GROUP_COLORS[0],
    };
  });

  edges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));

  document.getElementById('graph-stats').textContent =
    topNodes.length + ' files · ' + edges.length + ' imports';

  // Run force layout simulation
  for (let i=0;i<200;i++) tickForce();

  setupCanvasEvents();
  resizeCanvas();
  fitView();
  startRender();
}

/* ── Force-directed layout ─────────────────────────────────────────── */
function tickForce() {
  const repK = 1800;
  const attrK = 0.06;
  const idealLen = 120;
  const centerK = 0.003;

  // Repulsion between all pairs
  for (let i=0;i<nodes.length;i++) {
    for (let j=i+1;j<nodes.length;j++) {
      const a=nodes[i], b=nodes[j];
      const dx=b.x-a.x, dy=b.y-a.y;
      const distSq = Math.max(dx*dx+dy*dy, 1);
      const dist = Math.sqrt(distSq);
      const f = repK / distSq;
      const fx=(dx/dist)*f, fy=(dy/dist)*f;
      a.vx-=fx; a.vy-=fy;
      b.vx+=fx; b.vy+=fy;
    }
  }

  // Attraction along edges
  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  for (const e of edges) {
    const a=nodeMap.get(e.source), b=nodeMap.get(e.target);
    if (!a||!b) continue;
    const dx=b.x-a.x, dy=b.y-a.y;
    const dist=Math.max(Math.sqrt(dx*dx+dy*dy),1);
    const f = (dist-idealLen)/dist * attrK;
    a.vx+=dx*f; a.vy+=dy*f;
    b.vx-=dx*f; b.vy-=dy*f;
  }

  // Center gravity
  for (const n of nodes) {
    n.vx -= n.x * centerK;
    n.vy -= n.y * centerK;
    n.x += n.vx*0.5; n.y += n.vy*0.5;
    n.vx *= 0.72; n.vy *= 0.72;
  }
}

/* ── Canvas events ─────────────────────────────────────────────────── */
function setupCanvasEvents() {
  canvas.onwheel = e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    cam.x = mx - (mx - cam.x)*f;
    cam.y = my - (my - cam.y)*f;
    cam.scale = Math.max(0.15, Math.min(5, cam.scale*f));
    render();
  };

  canvas.onmousedown = e => {
    const {gx,gy} = screenToGraph(e.offsetX, e.offsetY);
    const hit = nodes.find(n => Math.hypot(n.x-gx, n.y-gy) < n.r+2);
    pointerState = { down: true, moved: false, startX: e.clientX, startY: e.clientY, node: hit };
    dragNode = hit;
    dragging = !hit;
    lastMouse = {x:e.clientX, y:e.clientY};
    canvas.classList.toggle('grabbing', dragging);
  };

  canvas.onmouseup = e => {
    const {gx,gy} = screenToGraph(e.offsetX, e.offsetY);
    const hit = nodes.find(n => Math.hypot(n.x-gx, n.y-gy) < n.r+3);
    const clickDistance = Math.hypot(e.clientX - pointerState.startX, e.clientY - pointerState.startY);

    if (pointerState.down && !pointerState.moved && pointerState.node && clickDistance < 5) {
      // Node click — show details and keep graph selection visible.
      selectNode(pointerState.node);
    } else if (pointerState.down && !pointerState.moved && !pointerState.node && !hit) {
      selectedNode = null;
      closeNodeDetail();
    }

    dragging=false; dragNode=null;
    pointerState.down = false;
    canvas.classList.remove('grabbing');
    render();
  };

  canvas.onmousemove = e => {
    if (pointerState.down) {
      const moved = Math.hypot(e.clientX - pointerState.startX, e.clientY - pointerState.startY);
      if (moved > 4) pointerState.moved = true;
    }

    if (dragging) {
      cam.x += e.clientX-lastMouse.x;
      cam.y += e.clientY-lastMouse.y;
      lastMouse = {x:e.clientX,y:e.clientY};
      render();
    } else if (dragNode) {
      const dx=(e.clientX-lastMouse.x)/cam.scale;
      const dy=(e.clientY-lastMouse.y)/cam.scale;
      dragNode.x+=dx; dragNode.y+=dy;
      dragNode.vx=0; dragNode.vy=0;
      lastMouse={x:e.clientX,y:e.clientY};
      render();
    } else {
      const {gx,gy}=screenToGraph(e.offsetX,e.offsetY);
      const hit=nodes.find(n=>Math.hypot(n.x-gx,n.y-gy)<n.r+3);
      canvas.title = hit ? hit.path : '';
      canvas.style.cursor = hit ? 'pointer' : 'grab';
    }
  };

  canvas.ondblclick = e => {
    const {gx,gy}=screenToGraph(e.offsetX,e.offsetY);
    const hit=nodes.find(n=>Math.hypot(n.x-gx,n.y-gy)<n.r+3);
    if (hit) vscode.postMessage({type:'openFile',payload:{path:hit.path}});
  };

  window.addEventListener('resize', ()=>{ resizeCanvas(); render(); });
}

function screenToGraph(sx,sy){ return {gx:(sx-cam.x)/cam.scale, gy:(sy-cam.y)/cam.scale}; }
function graphToScreen(gx,gy){ return {sx:gx*cam.scale+cam.x, sy:gy*cam.scale+cam.y}; }

function resizeCanvas() {
  if (!canvas||!canvasWrap) return;
  const rect = canvasWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) {
    return false;
  }
  canvas.width = rect.width;
  canvas.height = rect.height;
  canvas.style.width = rect.width+'px';
  canvas.style.height = rect.height+'px';
  return true;
}

function fitView() {
  if (!nodes.length||!canvas) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const n of nodes) {
    minX=Math.min(minX,n.x-n.r); maxX=Math.max(maxX,n.x+n.r);
    minY=Math.min(minY,n.y-n.r); maxY=Math.max(maxY,n.y+n.r);
  }
  const pad=40;
  const W=canvas.width-pad*2, H=canvas.height-pad*2;
  const gW=maxX-minX||1, gH=maxY-minY||1;
  cam.scale=Math.max(0.15,Math.min(2.5,Math.min(W/gW,H/gH)));
  cam.x=pad-(minX*cam.scale);
  cam.y=pad-(minY*cam.scale);
  render();
}

function zoom(f) { cam.scale=Math.max(0.15,Math.min(5,cam.scale*f)); render(); }
function resetView() { fitView(); }

/* ── Main render ───────────────────────────────────────────────────── */
function startRender() { render(); }

function render() {
  if (!canvas||!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(cam.x,cam.y);
  ctx.scale(cam.scale,cam.scale);

  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  const selectedId = selectedNode?.id;

  // Determine highlighted connections
  const connectedIds = new Set();
  if (selectedId) {
    edges.forEach(e=>{
      if(e.source===selectedId) connectedIds.add(e.target);
      if(e.target===selectedId) connectedIds.add(e.source);
    });
  }

  // ── Draw edges with arrows ──────────────────────────────────────────
  for (const e of edges) {
    const a=nodeMap.get(e.source), b=nodeMap.get(e.target);
    if(!a||!b) continue;

    const isRelated = selectedId && (e.source===selectedId || e.target===selectedId);
    const dimmed = selectedId && !isRelated;

    if (searchTerm) {
      const matchA = a.label.toLowerCase().includes(searchTerm);
      const matchB = b.label.toLowerCase().includes(searchTerm);
      if (!matchA && !matchB) continue;
    }

    // Direction: source imports target → arrow points TO target
    const dx=b.x-a.x, dy=b.y-a.y;
    const dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<1) continue;

    // Start/end on node circumference
    const startX=a.x+(dx/dist)*a.r;
    const startY=a.y+(dy/dist)*a.r;
    const endX=b.x-(dx/dist)*(b.r+7);
    const endY=b.y-(dy/dist)*(b.r+7);

    ctx.beginPath();
    ctx.moveTo(startX,startY);
    ctx.lineTo(endX,endY);

    if (isRelated && e.source===selectedId) {
      ctx.strokeStyle='rgba(86,156,214,0.85)';
      ctx.lineWidth=1.8;
    } else if (isRelated && e.target===selectedId) {
      ctx.strokeStyle='rgba(78,201,214,0.7)';
      ctx.lineWidth=1.4;
    } else if (dimmed) {
      ctx.strokeStyle='rgba(255,255,255,0.04)';
      ctx.lineWidth=0.5;
    } else {
      ctx.strokeStyle='rgba(255,255,255,0.12)';
      ctx.lineWidth=0.8;
    }
    ctx.stroke();

    // Arrowhead
    if (!dimmed) {
      const arrowLen=8, arrowAngle=0.45;
      const ang=Math.atan2(endY-startY,endX-startX);
      ctx.beginPath();
      ctx.moveTo(endX,endY);
      ctx.lineTo(endX-arrowLen*Math.cos(ang-arrowAngle), endY-arrowLen*Math.sin(ang-arrowAngle));
      ctx.moveTo(endX,endY);
      ctx.lineTo(endX-arrowLen*Math.cos(ang+arrowAngle), endY-arrowLen*Math.sin(ang+arrowAngle));
      ctx.strokeStyle = isRelated ? 'rgba(86,156,214,0.85)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = isRelated ? 1.8 : 0.8;
      ctx.stroke();
    }

    // Edge label (import name) — only when zoomed in and selected
    if (isRelated && e.label && cam.scale > 0.9) {
      const midX=(startX+endX)/2, midY=(startY+endY)/2;
      ctx.font='400 9px monospace';
      ctx.fillStyle='rgba(150,180,220,0.7)';
      ctx.textAlign='center';
      ctx.fillText(e.label.slice(0,20), midX, midY-4);
    }
  }

  // ── Draw nodes ──────────────────────────────────────────────────────
  for (const n of nodes) {
    const isSelected = n.id===selectedId;
    const isConn = connectedIds.has(n.id);
    const dimmed = selectedId && !isSelected && !isConn;

    if (searchTerm && !n.label.toLowerCase().includes(searchTerm)) {
      // Draw faded
      ctx.globalAlpha=0.15;
    } else if (dimmed) {
      ctx.globalAlpha=0.25;
    } else {
      ctx.globalAlpha=1;
    }

    // Shadow/glow for selected
    if (isSelected) {
      ctx.shadowColor=n.color; ctx.shadowBlur=16;
    } else if (isConn) {
      ctx.shadowColor=n.color; ctx.shadowBlur=6;
    } else {
      ctx.shadowBlur=0;
    }

    // Circle body
    ctx.beginPath();
    ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
    ctx.fillStyle= isSelected ? n.color : n.color+'55';
    ctx.fill();
    ctx.strokeStyle= n.color;
    ctx.lineWidth= isSelected ? 2 : (isConn ? 1.5 : 0.8);
    ctx.stroke();
    ctx.shadowBlur=0;

    // File name label
    const showLabel = cam.scale > 0.45 || isSelected || isConn;
    if (showLabel) {
      const fontSize = Math.max(8, Math.min(11, 9/cam.scale));
      ctx.font = \`\${isSelected||isConn?600:400} \${fontSize}px var(--vscode-font-family,'Segoe UI',sans-serif)\`;
      ctx.textAlign='center';
      ctx.fillStyle = isSelected ? '#fff' : isConn ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.65)';

      // Truncate long names
      let label=n.label;
      if (label.length>16) label=label.slice(0,14)+'…';
      ctx.fillText(label, n.x, n.y + n.r + fontSize + 2);
    }

    // In/Out degree badge on selected
    if (isSelected) {
      ctx.font='bold 9px monospace';
      ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(\`in \${n.inDegree}\`, n.x, n.y);
      ctx.textBaseline='alphabetic';
    }

    ctx.globalAlpha=1;
  }

  ctx.restore();
}

/* ── Node detail panel ─────────────────────────────────────────────── */
function selectNode(node) {
  selectedNode=node;
  const panel = document.getElementById('node-detail');
  panel.classList.add('open');

  document.getElementById('node-detail-filename').textContent=node.label;

  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  const importing = edges.filter(e=>e.source===node.id).map(e=>nodeMap.get(e.target)).filter(Boolean);
  const importedBy = edges.filter(e=>e.target===node.id).map(e=>nodeMap.get(e.source)).filter(Boolean);

  let html=\`<div class="detail-file-path">\${escHtml(node.path)}</div>\`;
  html+=\`<div style="display:flex;gap:10px;margin-bottom:8px;font-size:11px;color:var(--vscode-descriptionForeground)">
    <span><span class="inline-icon" data-icon="imports.svg"></span> imports <b>\${importing.length}</b></span>
    <span><span class="inline-icon" data-icon="used-by.svg"></span> used by <b>\${importedBy.length}</b></span>
    <span><span class="inline-icon" data-icon="language.svg"></span> \${node.language}</span>
  </div>\`;

  // Summary if available
  if (fileSummaryMap[node.path]) {
    const s=fileSummaryMap[node.path];
    html+=\`<div class="detail-label">Purpose</div><div style="font-size:11px;line-height:1.6;color:var(--vscode-editor-foreground)">\${escHtml(s.purpose)}</div>\`;
    if(s.exports) html+=\`<div class="detail-label">Exports</div><div style="font-size:10.5px;color:var(--vscode-descriptionForeground)">\${escHtml(s.exports)}</div>\`;
  }

  if (importing.length) {
    html+=\`<div class="detail-label">Imports (\${importing.length})</div>\`;
    html+=importing.slice(0,12).map(n=>
      \`<span class="detail-chip" onclick="selectNode(nodes.find(x=>x.id==='\${n.id}'));render()" title="\${n.path}">\${n.label}</span>\`
    ).join('');
    if(importing.length>12) html+=\`<span style="font-size:10px;color:var(--vscode-descriptionForeground)"> +\${importing.length-12} more</span>\`;
  }

  if (importedBy.length) {
    html+=\`<div class="detail-label">Used By (\${importedBy.length})</div>\`;
    html+=importedBy.slice(0,12).map(n=>
      \`<span class="detail-chip" onclick="selectNode(nodes.find(x=>x.id==='\${n.id}'));render()" title="\${n.path}">\${n.label}</span>\`
    ).join('');
    if(importedBy.length>12) html+=\`<span style="font-size:10px;color:var(--vscode-descriptionForeground)"> +\${importedBy.length-12} more</span>\`;
  }

  if (node.exports?.length) {
    html+=\`<div class="detail-label">Exports</div>\`;
    html+=node.exports.map(e=>\`<span class="detail-chip" style="cursor:default">\${escHtml(e)}</span>\`).join('');
  }

  html+=\`<button class="btn btn-secondary open-file-btn" onclick="openFileHandler('\${JSON.stringify(node.path).slice(1,-1)}')"><span class="btn-icon" data-icon="open-file.svg"></span> Open File</button>\`;

  document.getElementById('node-detail-body').innerHTML=html;
  render();
}

function closeNodeDetail() {
  document.getElementById('node-detail').classList.remove('open');
  selectedNode=null;
  render();
}

/* ── Graph search ──────────────────────────────────────────────────── */
function graphSearch(val) {
  searchTerm=val.toLowerCase().trim();
  render();
}

/* ══════════════════════════════════════════════════════════
   SUMMARY
══════════════════════════════════════════════════════════ */
function showSummary(s, name) {
  document.getElementById('summary-empty').style.display='none';
  document.getElementById('summary-ready').style.display='block';
  document.getElementById('s-name').textContent=name;
  document.getElementById('s-overview').textContent=s.overview||'';
  document.getElementById('s-arch').textContent=s.architecture||'';
  document.getElementById('s-tech').innerHTML=(s.techStack||[]).map(t=>\`<span class="chip">\${t}</span>\`).join('');
  document.getElementById('s-modules').innerHTML=(s.keyModules||[]).map(m=>
    \`<div class="card"><div class="card-title">\${m.name}</div><div class="card-body">\${m.description}</div></div>\`
  ).join('');
  document.getElementById('s-entries').innerHTML=(s.entryPoints||[]).map(p=>
    \`<div style="padding:2px 0;cursor:pointer;color:#569cd6" onclick="openFileHandler('\${JSON.stringify(p).slice(1,-1)}')">\${p}</div>\`
  ).join('')||'<span style="color:var(--vscode-descriptionForeground)">None detected</span>';
}

function showFileSummaries(files) {
  document.getElementById('s-file-count').textContent='('+files.length+')';
  // Store for node detail panel
  files.forEach(f=>{ fileSummaryMap[f.path]=f; });
  document.getElementById('s-files').innerHTML=files.map(f=>\`
    <div class="file-card" onclick="openFileHandler('\${JSON.stringify(f.path).slice(1,-1)}')">
      <div class="file-card-path">\${f.path}</div>
      <div class="file-card-desc">\${f.purpose}</div>
      \${f.exports?'<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px">Exports: '+f.exports+'</div>':''}
    </div>
  \`).join('');
}

/* ══════════════════════════════════════════════════════════
   HISTORY
══════════════════════════════════════════════════════════ */
function showHistory(records) {
  if (!records || records.length === 0) {
    document.getElementById('history-empty').style.display='flex';
    document.getElementById('history-ready').style.display='none';
    return;
  }
  document.getElementById('history-empty').style.display='none';
  document.getElementById('history-ready').style.display='block';
  document.getElementById('history-list').innerHTML = records.map(r=>\`
    <div class="card history-row">
      <div class="history-meta">
        <div class="card-title">\${r.label}</div>
        <div class="card-body" style="margin-top:2px">\${r.repoName}</div>
      </div>
      <div class="history-actions">
        <button class="btn btn-sm" onclick="loadAnalysisById('\${r.id}')" title="Restore">Restore</button>
        <button class="btn btn-sm btn-secondary" onclick="deleteAnalysisById('\${r.id}')" title="Delete">✕</button>
      </div>
    </div>
  \`).join('');
}
function loadAnalysisById(id) {
  if (!vscode) return;
  vscode.postMessage({type:'loadAnalysis',payload:{id}});
}
function deleteAnalysisById(id) {
  if (!confirm('Delete this analysis?')) return;
  if (!vscode) return;
  vscode.postMessage({type:'deleteAnalysis',payload:{id}});
}

/* ══════════════════════════════════════════════════════════
   Q&A
══════════════════════════════════════════════════════════ */
function enableQA() {
  document.getElementById('qa-empty').style.display='none';
  document.getElementById('qa-ready').style.display='flex';
}
function askQuick(q){ document.getElementById('chat-input').value=q; sendQ(); }
function chatKey(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQ();} }
function sendQ(){
  const inp=document.getElementById('chat-input');
  const q=inp.value.trim(); if(!q) return;
  inp.value='';
  addMsg('user',q);
  addThinking();
  vscode.postMessage({type:'askQuestion',payload:{question:q}});
}
function addMsg(role,txt){
  const h=document.getElementById('chat-history');
  const d=document.createElement('div');
  d.className='chat-msg';
  const iconHtml = role === 'user' 
    ? '<span class="inline-icon" data-icon="user.svg"></span>'
    : '<span class="inline-icon" data-icon="ai.svg"></span>';
  d.innerHTML=\`<div class="av av-\${role}">\${iconHtml}</div>
    <div class="bubble \${role==='user'?'user':''}">\${esc(txt)}</div>\`;
  h.appendChild(d); h.scrollTop=h.scrollHeight;
  hydrateIcons();
}
function addThinking(){
  const h=document.getElementById('chat-history');
  const d=document.createElement('div');
  d.id='thinking-msg'; d.className='chat-msg';
  d.innerHTML='<div class="av av-ai"><span class="inline-icon" data-icon="ai.svg"></span></div><div class="bubble"><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  h.appendChild(d); h.scrollTop=h.scrollHeight;
  hydrateIcons();
}
function removeThinking(){ document.getElementById('thinking-msg')?.remove(); }
function esc(t){ return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>'); }

/* ══════════════════════════════════════════════════════════
   SETTINGS
══════════════════════════════════════════════════════════ */
function selProv(name){
  document.querySelectorAll('.provider-card').forEach(c=>c.classList.remove('selected'));
  document.querySelectorAll('.provider-fields').forEach(f=>f.classList.remove('open'));
  document.getElementById('pc-'+name).classList.add('selected');
  document.getElementById('pf-'+name).classList.add('open');
}
function saveProv(name){
  const p={name};
  const k=document.getElementById('key-'+name); 
  if(k) { p.apiKey=k.value.trim(); }
  const m=document.getElementById('model-'+name); 
  if(m) {
    const custom=document.getElementById('custom-model-'+name);
    p.model=m.value === '__custom__' ? (custom?.value.trim() || '') : m.value;
  }
  const b=document.getElementById('baseurl-'+name); 
  if(b) { p.baseUrl=b.value.trim(); }
  if (!vscode) { return; }
  vscode.postMessage({type:'saveProvider',payload:p});
}

function toggleCustomModel(name) {
  const select = document.getElementById('model-'+name);
  const input = document.getElementById('custom-model-'+name);
  if (!select || !input) { return; }
  const isCustom = select.value === '__custom__';
  input.style.display = isCustom ? 'block' : 'none';
  if (isCustom && !input.value) {
    input.focus();
  }
}

/* ══════════════════════════════════════════════════════════
   ALERTS
══════════════════════════════════════════════════════════ */
function showAlert(scr,msg,type){ const el=document.getElementById(scr+'-alert'); if(el) el.innerHTML=\`<div class="alert alert-\${type}">\${msg}</div>\`; }
function clearAlert(scr){ const el=document.getElementById(scr+'-alert'); if(el) el.innerHTML=''; }

/* ══════════════════════════════════════════════════════════
   MESSAGE HANDLER
══════════════════════════════════════════════════════════ */
let _summary=null, _repoName='';

window.addEventListener('message',e=>{
  const {type,payload}=e.data;
  const stepPct={1:15,2:40,3:65,4:85};

  switch(type){
    case 'workspaceStatus':
      if(payload.hasWorkspace){
        document.getElementById('ws-name').textContent=payload.name;
        document.getElementById('ws-sub').textContent='Ready to analyze. Click the button below.';
      }
      break;

    case 'progress':
      setProgress(payload.step, stepPct[payload.step]||10, payload.message);
      break;

    case 'graphReady':
      setProgress(2,40,'Graph built!');
      initGraph(payload);
      break;

    case 'analysisRestored':
      _repoName=payload.repoName;
      _summary=payload.summary;
      setAnalyzing(false);
      initGraph(payload.graph);
      showFileSummaries(payload.fileSummaries || []);
      if(_summary) showSummary(_summary,_repoName);
      if(payload.hasQA) enableQA();
      showAlert('analyze','✓ Restored previous analysis. Re-analyze to refresh it.','success');
      break;

    case 'summaryReady':
      _summary=payload;
      setProgress(3,65,'Summary generated!');
      break;

    case 'fileSummariesReady':
      setProgress(4,88,'File summaries done!');
      showFileSummaries(payload);
      break;

    case 'analysisComplete':
      _repoName=payload.repoName;
      setProgress(4,100,'Analysis complete!');
      setAnalyzing(false);
      if(_summary) showSummary(_summary,_repoName);
      enableQA();
      showAlert('analyze','✓ Done! Open Graph, Summary and Q&A tabs.','success');
      break;

    case 'answer':
      removeThinking();
      addMsg('ai',payload.answer);
      break;

    case 'providerSaved':
      showAlert('settings','✓ Provider saved: '+payload.name,'success');
      break;

    case 'historyLoaded':
      showHistory(payload.records);
      break;

    case 'settingsLoaded':
      if(payload.providerName){
        selProv(payload.providerName);
        if(payload.hasKey){
          const k=document.getElementById('key-'+payload.providerName);
          if(k) k.placeholder='(saved) — paste to update';
        }
        if(payload.model){
          const m=document.getElementById('model-'+payload.providerName);
          const custom=document.getElementById('custom-model-'+payload.providerName);
          if(m) {
            const knownValues = Array.from(m.options).map((o) => o.value);
            if (knownValues.includes(payload.model)) {
              m.value = payload.model;
              if (custom) custom.style.display = 'none';
            } else {
              m.value = '__custom__';
              if (custom) {
                custom.value = payload.model;
                custom.style.display = 'block';
              }
            }
          }
        }
      }
      break;

    case 'error':
      setAnalyzing(false);
      showAlert('analyze','✗ '+payload.message,'error');
      showAlert('settings','✗ '+payload.message,'error');
      break;
  }
});

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  hydrateIcons();
  if (!vscode) { return; }
  vscode.postMessage({type:'getSettings'});
});

window.addEventListener('message', () => {
  ['groq','gemini','anthropic','openai'].forEach((name) => toggleCustomModel(name));
});
</script>
</body>
</html>`;
}