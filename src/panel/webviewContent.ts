export function getWebviewContent(params: { cspSource: string; iconUris: Record<string, string> }): string {
  const { cspSource, iconUris } = params;
  // NOTE: The message handler switch below has been patched to include all backend message types.
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

/* AI Tools */
.ai-result-box{
  background:var(--vscode-editor-background);
  border:1px solid var(--vscode-panel-border);
  border-radius:4px;padding:8px 10px;
  font-size:10.5px;line-height:1.75;
  white-space:pre-wrap;word-break:break-word;
  max-height:360px;overflow-y:auto;
  font-family:var(--vscode-font-family,'Segoe UI',sans-serif);
}
.ai-result-box::-webkit-scrollbar{width:3px}
.ai-result-box::-webkit-scrollbar-thumb{background:var(--vscode-panel-border);border-radius:2px}
.ai-tool-result-hdr{display:flex;justify-content:space-between;align-items:center;margin-bottom:5px}
.ai-tool-result-label{font-size:9.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:var(--vscode-descriptionForeground)}

/* Filter panel */
#filter-panel{
  padding:6px 8px;
  border-bottom:1px solid var(--vscode-panel-border);
  background:var(--vscode-sideBar-background);
  font-size:11px;flex-shrink:0;
}
.filter-row{display:flex;gap:12px;align-items:center;flex-wrap:wrap}
.filter-label{font-size:9.5px;text-transform:uppercase;letter-spacing:0.07em;font-weight:700;color:var(--vscode-descriptionForeground);margin-right:4px}
.ext-cb-label{margin-right:6px;cursor:pointer;font-size:10.5px;white-space:nowrap}
.depth-row{display:flex;align-items:center;gap:5px}
.depth-row input[type=range]{width:70px;padding:0;margin:0}
/* Flow tile hover */
.flow-preset:hover{background:var(--vscode-list-activeSelectionBackground)!important;color:var(--vscode-list-activeSelectionForeground)!important;opacity:1}
</style>
</head>
<body>

<div class="tabs">
  <button class="tab active" onclick="showTab('analyze')">Analyze</button>
  <button class="tab" onclick="showTab('graph')">Graph</button>
  <button class="tab" onclick="showTab('summary')">Summary</button>
  <button class="tab" onclick="showTab('flow')">Flow</button>
  <button class="tab" onclick="showTab('qa')">Q&amp;A</button>
  <button class="tab" onclick="showTab('aitools')">AI Tools</button>
  <button class="tab" onclick="showTab('history')">History</button>
  <button class="tab" data-tab="settings" onclick="showTab('settings')">Settings</button>
</div>

<!-- ANALYZE -->
<div id="tab-analyze" class="screen active">
  <div class="scroll">
    <div id="analyze-alert"></div>
    <div class="source-tabs">
      <button class="source-tab active" id="src-local-btn" onclick="switchSource('local')"><span class="tab-icon" data-icon="local-workspace.svg"></span> Local Workspace</button>
    </div>
    <div class="source-pane active" id="pane-local">
      <div class="card" id="workspace-info-card">
        <div class="card-title" id="ws-name">No workspace open</div>
        <div class="card-body" id="ws-sub">Open a folder in VS Code to analyze your local project</div>
      </div>
      <button class="btn btn-block" id="local-analyze-btn" onclick="analyzeLocal()" style="margin-bottom:10px">
        <span class="btn-icon" data-icon="analyze-workspace.svg"></span> Analyze Current Workspace
      </button>
      <div style="font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.7">
        Reads all code files from your workspace. Skips <code>node_modules</code>, <code>dist</code>, <code>.git</code> etc. automatically.
      </div>
    </div>
    <div id="progress-wrap" style="display:none" class="progress-wrap">
      <div class="progress-bar-outer"><div class="progress-bar-inner" id="pbar" style="width:8%"></div></div>
      <div id="progress-msg" style="font-size:11px;color:var(--vscode-descriptionForeground)">Starting...</div>
      <div class="progress-steps" style="margin-top:4px">
        <span id="ps1">1.Scan</span><span id="ps2">2.Graph</span><span id="ps3">3.Summary</span><span id="ps4">4.Files</span><span id="ps5">5.Flows</span>
      </div>
    </div>
  </div>
</div>

<!-- GRAPH -->
<div id="tab-graph" class="screen">
  <div id="graph-empty" style="display:flex">
    <div class="empty-icon" data-icon="graph-empty.svg"></div>
    <div class="empty-title">Dependency Graph</div>
    <div class="empty-sub">Analyze a project to see how files connect to each other</div>
  </div>
  <div id="graph-wrap" style="display:none;flex:1;flex-direction:column;min-height:0">
    <div class="graph-toolbar">
      <input type="text" id="graph-search" placeholder="Search file..." oninput="graphSearch(this.value)" style="flex:0 0 130px">
      <div class="zoom-btns">
        <div class="zoom-btn" onclick="zoom(1.25)" title="Zoom in">+</div>
        <div class="zoom-btn" onclick="zoom(0.8)" title="Zoom out">-</div>
        <div class="zoom-btn" onclick="resetView()" title="Fit all">⤢</div>
        <div class="zoom-btn" id="filter-toggle" onclick="toggleFilterPanel()" title="Filter">&#9783;</div>
      </div>
      <div class="legend" id="graph-legend"></div>
      <div class="graph-stats" id="graph-stats"></div>
    </div>
    <div id="filter-panel" style="display:none">
      <div class="filter-row">
        <div><span class="filter-label">Extensions:</span> <span id="ext-filters"></span></div>
        <div class="depth-row"><span class="filter-label">Depth:</span><input type="range" id="depth-filter" min="1" max="6" value="6"><span id="depth-val" style="font-family:monospace;font-size:10px;min-width:24px">All</span></div>
        <button class="btn btn-sm btn-secondary" id="clear-filter-btn">Clear</button>
      </div>
    </div>
    <div id="graph-canvas-wrap">
      <canvas id="graph-canvas"></canvas>
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

<!-- SUMMARY -->
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

<!-- Q&A -->
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
        <textarea class="chat-input" id="chat-input" placeholder="Ask anything about the codebase..." rows="1" onkeydown="chatKey(event)"></textarea>
        <button class="btn btn-sm" onclick="sendQ()" style="align-self:flex-end">↑</button>
      </div>
    </div>
  </div>
</div>

<!-- AI TOOLS -->
<div id="tab-aitools" class="screen">
  <div class="scroll">
    <div id="aitools-alert"></div>
    <div class="section-hdr">Generate Documentation</div>
    <div class="card" style="margin-bottom:10px">
      <div class="card-body" style="margin-bottom:8px">Save AI-generated docs to your workspace.</div>
      <div style="display:flex;flex-direction:column;gap:6px">
        <button class="btn btn-block" id="gen-readme-btn">&#128196; Generate README-REPOGRAPH.md</button>
        <button class="btn btn-block btn-secondary" id="gen-arch-btn">&#127963; Generate ARCHITECTURE-REPOGRAPH.md</button>
        <button class="btn btn-block btn-secondary" id="gen-onboarding-btn">&#128075; Generate ONBOARDING-REPOGRAPH.md</button>
      </div>
    </div>
    <div class="section-hdr">Refactor Analysis</div>
    <div class="card" style="margin-bottom:10px">
      <div class="card-body" style="margin-bottom:8px">Analyses coupling, god files, and architectural issues in your codebase.</div>
      <button class="btn btn-block btn-secondary" id="refactor-btn">&#128269; Analyze Code Quality</button>
      <div id="refactor-result" style="display:none;margin-top:10px">
        <div class="ai-tool-result-hdr">
          <span class="ai-tool-result-label">Analysis</span>
          <button class="btn btn-sm btn-secondary" id="save-refactor-btn">Save as REFACTOR-REPOGRAPH.md</button>
        </div>
        <div class="ai-result-box" id="refactor-content"></div>
      </div>
    </div>
    <div class="section-hdr">PR / Diff Review</div>
    <div class="card">
      <div class="card-body" style="margin-bottom:6px">Paste a <code>git diff</code> and get a structured code review.</div>
      <textarea id="pr-diff-input" placeholder="Paste git diff output here..." style="min-height:80px;max-height:180px;resize:vertical;font-family:monospace;font-size:10.5px;margin-bottom:6px"></textarea>
      <div style="display:flex;gap:6px">
        <button class="btn" id="review-pr-btn" style="flex:1">Review PR</button>
        <button class="btn btn-secondary" id="clear-pr-btn">Clear</button>
      </div>
      <div id="pr-result" style="display:none;margin-top:10px">
        <div class="ai-tool-result-hdr">
          <span class="ai-tool-result-label">Review</span>
          <button class="btn btn-sm btn-secondary" id="save-pr-btn">Save as PR-REVIEW-REPOGRAPH.md</button>
        </div>
        <div class="ai-result-box" id="pr-content"></div>
      </div>
    </div>
  </div>
</div>

<!-- FLOW -->
<div id="tab-flow" class="screen">
  <div id="flow-empty" class="empty" style="display:flex">
    <div class="empty-icon" data-icon="graph-empty.svg"></div>
    <div class="empty-title">Data Flow Diagrams</div>
    <div class="empty-sub">Analyze a project to see AI-detected flow diagrams for auth, API, data, and more</div>
  </div>
  <div id="flow-ready" style="display:none;flex-direction:column;height:100%;min-height:0;flex:1">

    <!-- Overview grid -->
    <div id="flow-overview" style="display:flex;flex-direction:column;flex:1;min-height:0">
      <!-- Preset quick buttons -->
      <div style="padding:7px 8px 5px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0">
        <div style="font-size:9.5px;text-transform:uppercase;letter-spacing:0.08em;font-weight:700;color:var(--vscode-descriptionForeground);margin-bottom:5px">Preset Flows</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px">
          <button class="btn btn-sm btn-secondary flow-preset" data-q="API request lifecycle flow">&#127760; API Request</button>
          <button class="btn btn-sm btn-secondary flow-preset" data-q="Authentication and authorization flow">&#128274; Auth Flow</button>
          <button class="btn btn-sm btn-secondary flow-preset" data-q="Component data flow and state management">&#9881; Component Data</button>
          <button class="btn btn-sm btn-secondary flow-preset" data-q="Database query and data access path">&#128451; DB Query Path</button>
        </div>
        <!-- Custom flow input -->
        <div style="display:flex;gap:5px">
          <input type="text" id="flow-question" placeholder="Custom flow: e.g. &quot;how does the email queue work&quot;" style="flex:1;font-size:11px;padding:4px 7px">
          <button class="btn btn-sm" id="flow-ask-btn" onclick="askCustomFlow()">Generate</button>
        </div>
      </div>
      <!-- Tiles -->
      <div class="scroll" id="flow-tiles" style="display:flex;flex-direction:column;gap:8px"></div>
    </div>

    <!-- Detail / drill-down panel -->
    <div id="flow-detail" style="display:none;flex-direction:column;flex:1;min-height:0">
      <div style="display:flex;align-items:center;gap:8px;padding:7px 8px;border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0">
        <button class="btn btn-sm btn-secondary" onclick="closeFlowDetail()">&#8592; Back</button>
        <div id="flow-detail-title" style="font-size:12px;font-weight:600;flex:1"></div>
        <button class="btn btn-sm btn-secondary" id="flow-copy-btn" title="Copy Mermaid source">Copy</button>
      </div>
      <div id="flow-detail-desc" style="padding:5px 10px;font-size:11px;color:var(--vscode-descriptionForeground);border-bottom:1px solid var(--vscode-panel-border);flex-shrink:0"></div>
      <!-- Rendered SVG diagram -->
      <div id="flow-render-wrap" style="flex:1;overflow:auto;padding:10px;display:flex;flex-direction:column;gap:8px">
        <div id="flow-svg-container" style="background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:5px;padding:12px;min-height:120px;display:flex;align-items:center;justify-content:center"></div>
        <!-- Collapsible Mermaid source -->
        <details style="margin-top:4px">
          <summary style="font-size:10px;color:var(--vscode-descriptionForeground);cursor:pointer;user-select:none;padding:3px 0">View Mermaid source</summary>
          <pre id="flow-mermaid-src" style="margin-top:5px;font-size:10px;font-family:monospace;background:var(--vscode-editor-background);border:1px solid var(--vscode-panel-border);border-radius:4px;padding:8px;overflow-x:auto;white-space:pre;word-break:normal"></pre>
        </details>
        <div id="flow-related-files" style="font-size:10px;color:var(--vscode-descriptionForeground)"></div>
      </div>
    </div>

  </div>
</div>

<!-- HISTORY -->
<div id="tab-history" class="screen">
  <div id="history-empty" class="empty" style="display:flex">
    <div class="empty-icon" data-icon="graph-empty.svg"></div>
    <div class="empty-title">No History</div>
    <div class="empty-sub">Analyze a project to save it to history</div>
  </div>
  <div id="history-ready" class="scroll" style="display:none">
    <div style="font-size:11px;color:var(--vscode-descriptionForeground);line-height:1.65;margin-bottom:8px">Recent analyses are automatically saved.</div>
    <div id="history-list"></div>
  </div>
</div>

<!-- SETTINGS -->
<div id="tab-settings" class="screen">
  <div class="scroll">
    <div id="settings-alert"></div>
    <div style="font-size:11.5px;font-weight:600;margin-bottom:6px">AI Provider</div>
    <div style="font-size:11px;color:var(--vscode-descriptionForeground);margin-bottom:10px;line-height:1.65">Keys stored in VS Code encrypted SecretStorage.</div>

    <!-- GROQ -->
    <div class="provider-card" id="pc-groq" onclick="selProv('groq')">
      <div class="provider-hdr"><div class="p-icon" style="background:#0a2a1e;color:#4ec9b0">G</div><div class="p-name">Groq</div><span class="badge badge-free">FREE</span></div>
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
      <div class="provider-hdr"><div class="p-icon" style="background:#2a1f0e;color:#dcdcaa">O</div><div class="p-name">Ollama (Local)</div><span class="badge badge-free">100% FREE</span></div>
      <div class="provider-fields" id="pf-ollama">
        <div class="alert alert-info" style="margin-bottom:6px">Runs locally — no API key needed.</div>
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
      <div class="provider-hdr"><div class="p-icon" style="background:#1c2a3e;color:#9cdcfe">G</div><div class="p-name">Google Gemini</div><span class="badge badge-free">FREE tier</span></div>
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
      <div class="provider-hdr"><div class="p-icon" style="background:#2d1f4e;color:#c586c0">A</div><div class="p-name">Anthropic Claude</div><span class="badge badge-paid">PAID</span></div>
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
      <div class="provider-hdr"><div class="p-icon" style="background:#1a2d1a;color:#4ec9b0">O</div><div class="p-name">OpenAI</div><span class="badge badge-paid">PAID</span></div>
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

    <div style="margin-top:16px;padding-top:10px;border-top:1px solid var(--vscode-panel-border)">
      <div style="font-size:11px;font-weight:600;margin-bottom:4px;color:var(--vscode-descriptionForeground)">Usage</div>
      <div id="token-display" style="font-size:11px;color:var(--vscode-descriptionForeground)">No analysis run yet</div>
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
    if (existing && existing.getAttribute('src') === iconUri) return;
    const img = document.createElement('img');
    img.className = 'icon-img';
    img.src = iconUri;
    img.alt = '';
    img.setAttribute('aria-hidden', 'true');
    img.onerror = () => { node.innerHTML = ''; };
    node.innerHTML = '';
    node.appendChild(img);
  });
}

function escHtml(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escAttr(s) { return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;'); }

try { vscode = acquireVsCodeApi(); } catch (e) {}

function openFileHandler(path) {
  if (!vscode) return;
  vscode.postMessage({type:'openFile',payload:{path}});
}

/* ══════════════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════════════ */
const TAB_NAMES = ['analyze','graph','summary','flow','qa','aitools','history','settings'];
function showTab(name) {
  document.querySelectorAll('.tab').forEach((t,i) => t.classList.toggle('active', TAB_NAMES[i]===name));
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('tab-'+name).classList.add('active');
  if (name==='graph' && graphBuilt) {
    setTimeout(() => { if (resizeCanvas()) fitView(); render(); }, 60);
  }
}

function switchSource(src) { if (src === 'local') return; }

/* ══════════════════════════════════════════════════════════
   ANALYZE
══════════════════════════════════════════════════════════ */
function analyzeLocal() {
  clearAlert('analyze');
  setAnalyzing(true);
  if (!vscode) return;
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
  ['ps1','ps2','ps3','ps4','ps5'].forEach((id,i) => {
    const el = document.getElementById(id);
    if (!el) return;
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
let searchTerm = '';
const fileSummaryMap = {};
let pointerState = { down: false, moved: false, startX: 0, startY: 0, node: null };

const GROUP_COLORS = ['#569cd6','#4ec9b0','#c586c0','#dcdcaa','#d7ba7d','#ce9178','#9cdcfe','#4fc1ff','#f48771','#b5cea8','#646695'];
const groupColorMap = {};

function initGraph(data) {
  graphBuilt = true;
  document.getElementById('graph-empty').style.display='none';
  document.getElementById('graph-wrap').style.display='flex';

  canvas = document.getElementById('graph-canvas');
  ctx = canvas.getContext('2d');
  canvasWrap = document.getElementById('graph-canvas-wrap');

  const groups = [...new Set(data.nodes.map(n=>n.group))];
  groups.forEach((g,i)=>{ groupColorMap[g] = GROUP_COLORS[i % GROUP_COLORS.length]; });

  const legEl = document.getElementById('graph-legend');
  legEl.innerHTML = groups.slice(0,6).map(g=>
    \`<div class="legend-item"><div class="legend-dot" style="background:\${groupColorMap[g]}"></div>\${g}</div>\`
  ).join('');

  const rankedNodes = [...data.nodes].sort((a,b)=>(b.inDegree+b.outDegree)-(a.inDegree+a.outDegree));
  const seedNodes = rankedNodes.slice(0,60);
  const nodeIds = new Set(seedNodes.map(n=>n.id));

  let expanded = true;
  while (expanded && nodeIds.size < 120) {
    expanded = false;
    for (const edge of data.edges) {
      if (nodeIds.size >= 120) break;
      if (nodeIds.has(edge.source) && !nodeIds.has(edge.target)) { nodeIds.add(edge.target); expanded = true; }
      else if (nodeIds.has(edge.target) && !nodeIds.has(edge.source)) { nodeIds.add(edge.source); expanded = true; }
    }
  }

  const topNodes = rankedNodes.filter(n => nodeIds.has(n.id)).slice(0,120);

  nodes = topNodes.map((n,i)=>{
    const angle = (i / topNodes.length) * Math.PI * 2;
    const r = 80 + Math.sqrt(topNodes.length) * 18;
    return { ...n, x: Math.cos(angle)*r + (Math.random()-0.5)*60, y: Math.sin(angle)*r + (Math.random()-0.5)*60, vx:0, vy:0, r: Math.max(14, Math.min(28, 14 + n.inDegree*2.5)), color: groupColorMap[n.group] || GROUP_COLORS[0] };
  });

  edges = data.edges.filter(e => nodeIds.has(e.source) && nodeIds.has(e.target));
  document.getElementById('graph-stats').textContent = topNodes.length + ' files \xb7 ' + edges.length + ' imports';

  for (let i=0;i<200;i++) tickForce();

  setupCanvasEvents();
  resizeCanvas();
  fitView();
  startRender();
}

function tickForce() {
  const repK=1800, attrK=0.06, idealLen=120, centerK=0.003;
  for (let i=0;i<nodes.length;i++) {
    for (let j=i+1;j<nodes.length;j++) {
      const a=nodes[i], b=nodes[j];
      const dx=b.x-a.x, dy=b.y-a.y;
      const distSq=Math.max(dx*dx+dy*dy,1), dist=Math.sqrt(distSq);
      const f=repK/distSq, fx=(dx/dist)*f, fy=(dy/dist)*f;
      a.vx-=fx; a.vy-=fy; b.vx+=fx; b.vy+=fy;
    }
  }
  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  for (const e of edges) {
    const a=nodeMap.get(e.source), b=nodeMap.get(e.target);
    if (!a||!b) continue;
    const dx=b.x-a.x, dy=b.y-a.y, dist=Math.max(Math.sqrt(dx*dx+dy*dy),1);
    const f=(dist-idealLen)/dist*attrK;
    a.vx+=dx*f; a.vy+=dy*f; b.vx-=dx*f; b.vy-=dy*f;
  }
  for (const n of nodes) {
    n.vx -= n.x*centerK; n.vy -= n.y*centerK;
    n.x += n.vx*0.5; n.y += n.vy*0.5;
    n.vx *= 0.72; n.vy *= 0.72;
  }
}

function setupCanvasEvents() {
  canvas.onwheel = e => {
    e.preventDefault();
    const f = e.deltaY < 0 ? 1.12 : 0.89;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX-rect.left, my = e.clientY-rect.top;
    cam.x = mx-(mx-cam.x)*f; cam.y = my-(my-cam.y)*f;
    cam.scale = Math.max(0.15, Math.min(5, cam.scale*f));
    render();
  };
  canvas.onmousedown = e => {
    const {gx,gy} = screenToGraph(e.offsetX, e.offsetY);
    const hit = nodes.find(n => Math.hypot(n.x-gx, n.y-gy) < n.r+2);
    pointerState = { down: true, moved: false, startX: e.clientX, startY: e.clientY, node: hit };
    dragNode = hit; dragging = !hit; lastMouse = {x:e.clientX, y:e.clientY};
    canvas.classList.toggle('grabbing', dragging);
  };
  canvas.onmouseup = e => {
    const clickDistance = Math.hypot(e.clientX-pointerState.startX, e.clientY-pointerState.startY);
    if (pointerState.down && !pointerState.moved && pointerState.node && clickDistance < 5) selectNode(pointerState.node);
    else if (pointerState.down && !pointerState.moved && !pointerState.node) { selectedNode=null; closeNodeDetail(); }
    dragging=false; dragNode=null; pointerState.down=false;
    canvas.classList.remove('grabbing');
    render();
  };
  canvas.onmousemove = e => {
    if (pointerState.down && Math.hypot(e.clientX-pointerState.startX, e.clientY-pointerState.startY) > 4) pointerState.moved = true;
    if (dragging) { cam.x+=e.clientX-lastMouse.x; cam.y+=e.clientY-lastMouse.y; lastMouse={x:e.clientX,y:e.clientY}; render(); }
    else if (dragNode) { const dx=(e.clientX-lastMouse.x)/cam.scale, dy=(e.clientY-lastMouse.y)/cam.scale; dragNode.x+=dx; dragNode.y+=dy; dragNode.vx=0; dragNode.vy=0; lastMouse={x:e.clientX,y:e.clientY}; render(); scheduleSaveLayout(); }
    else { const {gx,gy}=screenToGraph(e.offsetX,e.offsetY); const hit=nodes.find(n=>Math.hypot(n.x-gx,n.y-gy)<n.r+3); canvas.title=hit?hit.path:''; canvas.style.cursor=hit?'pointer':'grab'; }
  };
  canvas.ondblclick = e => {
    const {gx,gy}=screenToGraph(e.offsetX,e.offsetY);
    const hit=nodes.find(n=>Math.hypot(n.x-gx,n.y-gy)<n.r+3);
    if (hit && vscode) vscode.postMessage({type:'openFile',payload:{path:hit.path}});
  };
  window.addEventListener('resize', ()=>{ resizeCanvas(); render(); });
}

function screenToGraph(sx,sy){ return {gx:(sx-cam.x)/cam.scale, gy:(sy-cam.y)/cam.scale}; }

function resizeCanvas() {
  if (!canvas||!canvasWrap) return false;
  const rect = canvasWrap.getBoundingClientRect();
  if (!rect.width || !rect.height) return false;
  canvas.width=rect.width; canvas.height=rect.height;
  canvas.style.width=rect.width+'px'; canvas.style.height=rect.height+'px';
  return true;
}

function fitView() {
  if (!nodes.length||!canvas) return;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const n of nodes) { minX=Math.min(minX,n.x-n.r); maxX=Math.max(maxX,n.x+n.r); minY=Math.min(minY,n.y-n.r); maxY=Math.max(maxY,n.y+n.r); }
  const pad=40, W=canvas.width-pad*2, H=canvas.height-pad*2;
  const gW=maxX-minX||1, gH=maxY-minY||1;
  cam.scale=Math.max(0.15,Math.min(2.5,Math.min(W/gW,H/gH)));
  cam.x=pad-(minX*cam.scale); cam.y=pad-(minY*cam.scale);
  render();
}

function zoom(f) { cam.scale=Math.max(0.15,Math.min(5,cam.scale*f)); render(); }
function resetView() { fitView(); }
function startRender() { render(); }

function render() {
  if (!canvas||!ctx) return;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(cam.x,cam.y);
  ctx.scale(cam.scale,cam.scale);

  const nodeMap = new Map(nodes.map(n=>[n.id,n]));
  const selectedId = selectedNode?.id;
  const connectedIds = new Set();
  if (selectedId) edges.forEach(e=>{ if(e.source===selectedId) connectedIds.add(e.target); if(e.target===selectedId) connectedIds.add(e.source); });

  for (const e of edges) {
    const a=nodeMap.get(e.source), b=nodeMap.get(e.target);
    if(!a||!b) continue;
    const isRelated = selectedId && (e.source===selectedId || e.target===selectedId);
    const dimmed = selectedId && !isRelated;
    if (searchTerm && !a.label.toLowerCase().includes(searchTerm) && !b.label.toLowerCase().includes(searchTerm)) continue;
    const dx=b.x-a.x, dy=b.y-a.y, dist=Math.sqrt(dx*dx+dy*dy);
    if(dist<1) continue;
    const startX=a.x+(dx/dist)*a.r, startY=a.y+(dy/dist)*a.r;
    const endX=b.x-(dx/dist)*(b.r+7), endY=b.y-(dy/dist)*(b.r+7);
    ctx.beginPath(); ctx.moveTo(startX,startY); ctx.lineTo(endX,endY);
    if (isRelated && e.source===selectedId) { ctx.strokeStyle='rgba(86,156,214,0.85)'; ctx.lineWidth=1.8; }
    else if (isRelated) { ctx.strokeStyle='rgba(78,201,214,0.7)'; ctx.lineWidth=1.4; }
    else if (dimmed) { ctx.strokeStyle='rgba(255,255,255,0.04)'; ctx.lineWidth=0.5; }
    else { ctx.strokeStyle='rgba(255,255,255,0.12)'; ctx.lineWidth=0.8; }
    ctx.stroke();
    if (!dimmed) {
      const arrowLen=8, arrowAngle=0.45, ang=Math.atan2(endY-startY,endX-startX);
      ctx.beginPath();
      ctx.moveTo(endX,endY); ctx.lineTo(endX-arrowLen*Math.cos(ang-arrowAngle),endY-arrowLen*Math.sin(ang-arrowAngle));
      ctx.moveTo(endX,endY); ctx.lineTo(endX-arrowLen*Math.cos(ang+arrowAngle),endY-arrowLen*Math.sin(ang+arrowAngle));
      ctx.strokeStyle = isRelated ? 'rgba(86,156,214,0.85)' : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = isRelated ? 1.8 : 0.8;
      ctx.stroke();
    }
    if (isRelated && e.label && cam.scale > 0.9) {
      ctx.font='400 9px monospace'; ctx.fillStyle='rgba(150,180,220,0.7)'; ctx.textAlign='center';
      ctx.fillText(e.label.slice(0,20),(startX+endX)/2,(startY+endY)/2-4);
    }
  }

  for (const n of nodes) {
    const isSelected=n.id===selectedId, isConn=connectedIds.has(n.id);
    const dimmed = selectedId && !isSelected && !isConn;
    ctx.globalAlpha = searchTerm && !n.label.toLowerCase().includes(searchTerm) ? 0.15 : dimmed ? 0.25 : 1;
    ctx.shadowColor=isSelected?n.color:isConn?n.color:''; ctx.shadowBlur=isSelected?16:isConn?6:0;
    ctx.beginPath(); ctx.arc(n.x,n.y,n.r,0,Math.PI*2);
    ctx.fillStyle=isSelected?n.color:n.color+'55'; ctx.fill();
    ctx.strokeStyle=n.color; ctx.lineWidth=isSelected?2:isConn?1.5:0.8; ctx.stroke();
    ctx.shadowBlur=0;
    if (cam.scale > 0.45 || isSelected || isConn) {
      const fs=Math.max(8,Math.min(11,9/cam.scale));
      ctx.font=\`\${isSelected||isConn?600:400} \${fs}px var(--vscode-font-family,'Segoe UI',sans-serif)\`;
      ctx.textAlign='center';
      ctx.fillStyle=isSelected?'#fff':isConn?'rgba(255,255,255,0.9)':'rgba(255,255,255,0.65)';
      let label=n.label; if(label.length>16) label=label.slice(0,14)+'\u2026';
      ctx.fillText(label,n.x,n.y+n.r+fs+2);
    }
    if (isSelected) {
      ctx.font='bold 9px monospace'; ctx.fillStyle='rgba(255,255,255,0.9)';
      ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText(\`in \${n.inDegree}\`,n.x,n.y); ctx.textBaseline='alphabetic';
    }
    ctx.globalAlpha=1;
  }
  ctx.restore();
}

function selectNode(node) {
  selectedNode=node;
  document.getElementById('node-detail').classList.add('open');
  document.getElementById('node-detail-filename').textContent=node.label;

  const nodeMap=new Map(nodes.map(n=>[n.id,n]));
  const importing=edges.filter(e=>e.source===node.id).map(e=>nodeMap.get(e.target)).filter(Boolean);
  const importedBy=edges.filter(e=>e.target===node.id).map(e=>nodeMap.get(e.source)).filter(Boolean);

  let html=\`<div class="detail-file-path">\${escHtml(node.path)}</div>\`;
  html+=\`<div style="display:flex;gap:10px;margin-bottom:8px;font-size:11px;color:var(--vscode-descriptionForeground)"><span>imports <b>\${importing.length}</b></span><span>used by <b>\${importedBy.length}</b></span><span>\${node.language}</span></div>\`;
  if (fileSummaryMap[node.path]) {
    const s=fileSummaryMap[node.path];
    html+=\`<div class="detail-label">Purpose</div><div style="font-size:11px;line-height:1.6">\${escHtml(s.purpose)}</div>\`;
    if(s.exports) html+=\`<div class="detail-label">Exports</div><div style="font-size:10.5px;color:var(--vscode-descriptionForeground)">\${escHtml(s.exports)}</div>\`;
  }
  if (importing.length) { html+=\`<div class="detail-label">Imports (\${importing.length})</div>\`; html+=importing.slice(0,12).map(n=>\`<span class="detail-chip" data-nid="\${escAttr(n.id)}">\${escHtml(n.label)}</span>\`).join(''); }
  if (importedBy.length) { html+=\`<div class="detail-label">Used By (\${importedBy.length})</div>\`; html+=importedBy.slice(0,12).map(n=>\`<span class="detail-chip" data-nid="\${escAttr(n.id)}">\${escHtml(n.label)}</span>\`).join(''); }
  if (node.exports?.length) { html+=\`<div class="detail-label">Exports</div>\`; html+=node.exports.map(e=>\`<span class="detail-chip" style="cursor:default">\${escHtml(e)}</span>\`).join(''); }
  html+=\`<button class="btn btn-secondary open-file-btn" style="margin-top:10px;width:100%;justify-content:center" data-fpath="\${escAttr(node.path)}">Open File</button>\`;

  const detailBody=document.getElementById('node-detail-body');
  detailBody.innerHTML=html;
  detailBody.querySelectorAll('.detail-chip[data-nid]').forEach(function(el){
    el.addEventListener('click',function(){ const t=nodes.find(x=>x.id===el.dataset.nid); if(t){selectNode(t);render();} });
  });
  const openBtn=detailBody.querySelector('.open-file-btn');
  if(openBtn) openBtn.addEventListener('click',function(){ openFileHandler(openBtn.dataset.fpath); });
  hydrateIcons(); render();
}

function closeNodeDetail() { document.getElementById('node-detail').classList.remove('open'); selectedNode=null; render(); }
function graphSearch(val) { searchTerm=val.toLowerCase().trim(); render(); }

/* ══════════════════════════════════════════════════════════
   SUMMARY
══════════════════════════════════════════════════════════ */
function showSummary(s, name) {
  document.getElementById('summary-empty').style.display='none';
  document.getElementById('summary-ready').style.display='block';
  document.getElementById('s-name').textContent=name;
  document.getElementById('s-overview').textContent=s.overview||'';
  document.getElementById('s-arch').textContent=s.architecture||'';
  document.getElementById('s-tech').innerHTML=(s.techStack||[]).map(t=>\`<span class="chip">\${escHtml(t)}</span>\`).join('');
  document.getElementById('s-modules').innerHTML=(s.keyModules||[]).map(m=>\`<div class="card"><div class="card-title">\${escHtml(m.name)}</div><div class="card-body">\${escHtml(m.description)}</div></div>\`).join('');
  document.getElementById('s-entries').innerHTML=(s.entryPoints||[]).map(p=>\`<div class="entry-point" style="padding:2px 0;cursor:pointer;color:#569cd6" data-fpath="\${escAttr(p)}">\${escHtml(p)}</div>\`).join('')||'<span style="color:var(--vscode-descriptionForeground)">None detected</span>';
  document.querySelectorAll('#s-entries .entry-point').forEach(function(el){ el.addEventListener('click',function(){ openFileHandler(el.dataset.fpath); }); });
}

function showFileSummaries(files) {
  document.getElementById('s-file-count').textContent='('+files.length+')';
  files.forEach(f=>{ fileSummaryMap[f.path]=f; });
  document.getElementById('s-files').innerHTML=files.map(f=>\`
    <div class="file-card" data-fpath="\${escAttr(f.path)}">
      <div class="file-card-path">\${escHtml(f.path)}</div>
      <div class="file-card-desc">\${escHtml(f.purpose)}</div>
      \${f.exports?'<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px">Exports: '+escHtml(f.exports)+'</div>':''}
    </div>
  \`).join('');
  document.querySelectorAll('#s-files .file-card').forEach(function(el){ el.addEventListener('click',function(){ openFileHandler(el.dataset.fpath); }); });
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
      <div class="history-meta"><div class="card-title">\${escHtml(r.label)}</div><div class="card-body" style="margin-top:2px">\${escHtml(r.repoName)}</div></div>
      <div class="history-actions">
        <button class="btn btn-sm restore-btn" data-rid="\${escAttr(r.id)}">Restore</button>
        <button class="btn btn-sm btn-secondary delete-btn" data-rid="\${escAttr(r.id)}">✕</button>
      </div>
    </div>
  \`).join('');
  document.querySelectorAll('#history-list .restore-btn').forEach(function(btn){ btn.addEventListener('click',function(){ if(vscode) vscode.postMessage({type:'loadAnalysis',payload:{id:btn.dataset.rid}}); }); });
  document.querySelectorAll('#history-list .delete-btn').forEach(function(btn){ btn.addEventListener('click',function(){ if(confirm('Delete this analysis?')&&vscode) vscode.postMessage({type:'deleteAnalysis',payload:{id:btn.dataset.rid}}); }); });
}

/* ══════════════════════════════════════════════════════════
   Q&A
══════════════════════════════════════════════════════════ */
function enableQA() { document.getElementById('qa-empty').style.display='none'; document.getElementById('qa-ready').style.display='flex'; }
function askQuick(q){ document.getElementById('chat-input').value=q; sendQ(); }
function chatKey(e){ if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendQ();} }
function sendQ(){
  const inp=document.getElementById('chat-input');
  const q=inp.value.trim(); if(!q) return; inp.value='';
  addMsg('user',q); addThinking();
  if(vscode) vscode.postMessage({type:'askQuestion',payload:{question:q}});
}
function addMsg(role,txt){
  const h=document.getElementById('chat-history');
  const d=document.createElement('div'); d.className='chat-msg';
  d.innerHTML=\`<div class="av av-\${role}">\${role==='user'?'U':'AI'}</div><div class="bubble \${role==='user'?'user':''}">\${esc(txt)}</div>\`;
  h.appendChild(d); h.scrollTop=h.scrollHeight;
}
function addThinking(){
  const h=document.getElementById('chat-history');
  const d=document.createElement('div'); d.id='thinking-msg'; d.className='chat-msg';
  d.innerHTML='<div class="av av-ai">AI</div><div class="bubble"><div class="thinking-dots"><span></span><span></span><span></span></div></div>';
  h.appendChild(d); h.scrollTop=h.scrollHeight;
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
  const k=document.getElementById('key-'+name); if(k) p.apiKey=k.value.trim();
  const m=document.getElementById('model-'+name);
  if(m){ const custom=document.getElementById('custom-model-'+name); p.model=m.value==='__custom__'?(custom?.value.trim()||''):m.value; }
  const b=document.getElementById('baseurl-'+name); if(b) p.baseUrl=b.value.trim();
  if(vscode) vscode.postMessage({type:'saveProvider',payload:p});
}
function toggleCustomModel(name){
  const sel=document.getElementById('model-'+name), inp=document.getElementById('custom-model-'+name);
  if(!sel||!inp) return;
  inp.style.display=sel.value==='__custom__'?'block':'none';
  if(sel.value==='__custom__'&&!inp.value) inp.focus();
}

/* ══════════════════════════════════════════════════════════
   ALERTS
══════════════════════════════════════════════════════════ */
function showAlert(scr,msg,type){ const el=document.getElementById(scr+'-alert'); if(el) el.innerHTML=\`<div class="alert alert-\${type}">\${msg}</div>\`; }
function clearAlert(scr){ const el=document.getElementById(scr+'-alert'); if(el) el.innerHTML=''; }

/* ══════════════════════════════════════════════════════════
   AI TOOLS
══════════════════════════════════════════════════════════ */
let _refactorContent='', _prContent='';

function generateDoc(t){ clearAlert('aitools'); if(vscode) vscode.postMessage({type:'generateDoc',payload:{docType:t}}); }
function analyzeRefactor(){ clearAlert('aitools'); if(vscode) vscode.postMessage({type:'analyzeRefactor'}); }
function reviewPR(){
  clearAlert('aitools');
  const d=document.getElementById('pr-diff-input').value.trim();
  if(!d){ showAlert('aitools','Paste a git diff first.','error'); return; }
  if(vscode) vscode.postMessage({type:'reviewPR',payload:{diff:d}});
}
function saveAIDoc(f,c){ if(vscode) vscode.postMessage({type:'saveDoc',payload:{filename:f,content:c}}); }
function setAIToolBusy(t,b){
  const ids={readme:'gen-readme-btn',architecture:'gen-arch-btn',onboarding:'gen-onboarding-btn',refactor:'refactor-btn',pr:'review-pr-btn'};
  const el=document.getElementById(ids[t]); if(el) el.disabled=b;
}

/* ══════════════════════════════════════════════════════════
   GRAPH FILTER
══════════════════════════════════════════════════════════ */
let _activeDepth=99;
function toggleFilterPanel(){
  const p=document.getElementById('filter-panel'); if(!p) return;
  const open=p.style.display==='none'||!p.style.display;
  p.style.display=open?'block':'none';
}
function applyFilters(){
  const de=document.getElementById('depth-filter');
  if(de){ _activeDepth=parseInt(de.value); const dv=document.getElementById('depth-val'); if(dv) dv.textContent=_activeDepth>=6?'All':String(_activeDepth); }
  render();
}
function clearFilters(){
  document.querySelectorAll('.ext-cb').forEach(el=>el.checked=true);
  const de=document.getElementById('depth-filter'); if(de) de.value='6';
  const dv=document.getElementById('depth-val'); if(dv) dv.textContent='All';
  _activeDepth=99; render();
}

/* PERSISTENT LAYOUT */
let _layoutTimer=null;
function scheduleSaveLayout(){
  if(!vscode||!nodes.length) return;
  clearTimeout(_layoutTimer);
  _layoutTimer=setTimeout(function(){
    const pos=nodes.map(n=>({id:n.id,x:Math.round(n.x),y:Math.round(n.y)}));
    vscode.postMessage({type:'saveLayout',payload:{positions:pos}});
  },800);
}
function applyLayout(positions){
  if(!positions||!nodes.length) return;
  const pm=new Map(positions.map(p=>[p.id,p]));
  nodes.forEach(n=>{ const s=pm.get(n.id); if(s){n.x=s.x;n.y=s.y;n.vx=0;n.vy=0;} });
  render();
}

/* TOKEN USAGE */
function updateTokenDisplay(total){ const el=document.getElementById('token-display'); if(el) el.textContent='~'+total.toLocaleString()+' tokens used (estimated)'; }

/* ══════════════════════════════════════════════════════════
   MESSAGE HANDLER  <- COMPLETE with all backend message types
══════════════════════════════════════════════════════════ */
let _summary=null, _repoName='';

window.addEventListener('message', e=>{
  const {type, payload} = e.data;

  switch(type){
    case 'workspaceStatus':
      if(payload.hasWorkspace){
        document.getElementById('ws-name').textContent=payload.name;
        document.getElementById('ws-sub').textContent='Ready to analyze. Click the button below.';
      }
      break;

    case 'progress': {
      const pct5 = {1:12,2:35,3:60,4:82,5:95};
      setProgress(payload.step, pct5[payload.step]||10, payload.message);
      break;
    }

    case 'graphReady':
      setProgress(2,40,'Graph built!');
      initGraph(payload);
      break;

    // analysisRestored — handled in the case block below

    case 'summaryReady':
      _summary=payload; setProgress(3,65,'Summary generated!'); break;

    case 'fileSummariesReady':
      setProgress(4,88,'File summaries done!'); showFileSummaries(payload); break;

    case 'analysisComplete':
      _repoName=payload.repoName; setProgress(5,100,'Analysis complete!'); setAnalyzing(false);
      if(_summary) showSummary(_summary,_repoName); enableQA();
      showAlert('analyze','✓ Done! Open Graph, Summary, Flow and Q&A tabs.','success');
      break;

    case 'flowMapReady':
      showFlowMap(payload);
      break;

    case 'analysisRestored':
      _repoName=payload.repoName; _summary=payload.summary;
      setAnalyzing(false);
      initGraph(payload.graph);
      showFileSummaries(payload.fileSummaries||[]);
      if(_summary) showSummary(_summary,_repoName);
      if(payload.flowMap) showFlowMap(payload.flowMap);
      if(payload.hasQA) enableQA();
      showAlert('analyze','✓ Restored previous analysis. Re-analyze to refresh it.','success');
      break;

    case 'customFlowReady':
      addCustomFlowTile(payload.diagram);
      break;

    case 'customFlowBusy': {
      const ab=document.getElementById('flow-ask-btn'); if(ab) ab.disabled=payload.busy;
      break;
    }

    case 'answer':
      removeThinking(); addMsg('ai',payload.answer); break;

    case 'providerSaved':
      showAlert('settings','✓ Provider saved: '+payload.name,'success'); break;

    case 'historyLoaded':
      showHistory(payload.records); break;

    case 'settingsLoaded':
      if(payload.providerName){
        selProv(payload.providerName);
        if(payload.hasKey){ const k=document.getElementById('key-'+payload.providerName); if(k) k.placeholder='(saved) — paste to update'; }
        if(payload.model){
          const m=document.getElementById('model-'+payload.providerName);
          const custom=document.getElementById('custom-model-'+payload.providerName);
          if(m){
            const known=Array.from(m.options).map(o=>o.value);
            if(known.includes(payload.model)){ m.value=payload.model; if(custom) custom.style.display='none'; }
            else{ m.value='__custom__'; if(custom){custom.value=payload.model; custom.style.display='block';} }
          }
        }
      }
      break;

    case 'error':
      setAnalyzing(false);
      showAlert('analyze','✗ '+payload.message,'error');
      showAlert('settings','✗ '+payload.message,'error');
      break;

    /* -- AI TOOLS -- */
    case 'aiToolBusy':
      setAIToolBusy(payload.docType, payload.busy); break;

    case 'aiToolError':
      showAlert('aitools','✗ '+payload.message,'error'); break;

    case 'docSaved':
      showAlert('aitools','✓ Saved: '+(payload.filename||payload.docType),'success'); break;

    case 'refactorResult':
      _refactorContent=payload.content;
      document.getElementById('refactor-content').textContent=payload.content;
      document.getElementById('refactor-result').style.display='block';
      break;

    case 'prReviewResult':
      _prContent=payload.content;
      document.getElementById('pr-content').textContent=payload.content;
      document.getElementById('pr-result').style.display='block';
      break;

    case 'tokenUsage':
      updateTokenDisplay(payload.total); break;

    case 'layoutLoaded':
      applyLayout(payload.positions); break;
  }
});

/* ══════════════════════════════════════════════════════════
   INIT
══════════════════════════════════════════════════════════ */
window.addEventListener('load', () => {
  hydrateIcons();

  // Wire up AI tools buttons
  const btnMap = {
    'gen-readme-btn':     ()=>generateDoc('readme'),
    'gen-arch-btn':       ()=>generateDoc('architecture'),
    'gen-onboarding-btn': ()=>generateDoc('onboarding'),
    'refactor-btn':       ()=>analyzeRefactor(),
    'review-pr-btn':      ()=>reviewPR(),
    'clear-pr-btn':       ()=>{ document.getElementById('pr-diff-input').value=''; },
    'save-refactor-btn':  ()=>{ if(_refactorContent) saveAIDoc('REFACTOR-REPOGRAPH.md',_refactorContent); },
    'save-pr-btn':        ()=>{ if(_prContent) saveAIDoc('PR-REVIEW-REPOGRAPH.md',_prContent); },
    'clear-filter-btn':   ()=>clearFilters(),
  };
  Object.entries(btnMap).forEach(([id,fn])=>{ const el=document.getElementById(id); if(el) el.addEventListener('click',fn); });

  const df=document.getElementById('depth-filter'); if(df) df.addEventListener('input',applyFilters);

  // Keyboard shortcuts
  document.addEventListener('keydown',function(e){
    const tag=e.target.tagName;
    if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT') return;
    if(e.key==='Escape'){
      if(document.getElementById('node-detail').classList.contains('open')) closeNodeDetail();
      else{ const gs=document.getElementById('graph-search'); if(gs&&gs.value){gs.value='';graphSearch('');} }
      return;
    }
    if((e.ctrlKey||e.metaKey)&&e.key==='f'){
      e.preventDefault(); showTab('graph');
      setTimeout(()=>{ const gs=document.getElementById('graph-search'); if(gs) gs.focus(); },60);
    }
  });

  ['groq','gemini','anthropic','openai'].forEach(name=>toggleCustomModel(name));

  wireFlowPresets();

  if(vscode) vscode.postMessage({type:'getSettings'});
});

/* ══════════════════════════════════════════════════════════
   FLOW DIAGRAMS
══════════════════════════════════════════════════════════ */
let _currentFlowMap = null;
let _selectedDiagram = null;

// -- Mermaid -> SVG renderer (pure JS, no CDN needed) ---------
// We parse the flowchart AST and render to an inline SVG.
function renderMermaidToSvg(code) {
  try {
    const lines = code.split('\\n').map(l => l.trim()).filter(l => l && !l.startsWith('flowchart') && !l.startsWith('graph') && !l.startsWith('%%'));
    const nodeMap = {}; // id -> label
    const edges = [];   // {from, to, label}
    const nodeRe = /^([A-Za-z0-9_]+)(?:\\[([^\\]]+)\\]|\\{([^}]+)\\}|\\(([^)]+)\\)|\\(\\(([^)]+)\\)\\)|\\[\\[([^\\]]+)\\]\\]|\\[\\(([^)]+)\\)\\])?$/;
    const edgeRe = /^([A-Za-z0-9_]+)\\s*(-->|--\\s*[^>]*\\s*-->|--\\|([^|]*)\\|-->|--\\|([^|]*)\\|)\\s*([A-Za-z0-9_]+)(.*)$/;

    for (const line of lines) {
      // edge
      const em = line.match(/^([A-Za-z0-9_]+)\\s*(?:--\\|([^|]*)\\||-->|--[^>]*-->)\\s*([A-Za-z0-9_]+)/);
      if (em) {
        const labelM = line.match(/--\\|([^|]*)\\|/);
        edges.push({ from: em[1], to: em[3], label: labelM ? labelM[1].trim() : '' });
        // register nodes without labels if not yet seen
        if (!nodeMap[em[1]]) nodeMap[em[1]] = em[1];
        if (!nodeMap[em[3]]) nodeMap[em[3]] = em[3];
        continue;
      }
      // node definition
      const bracketM = line.match(/^([A-Za-z0-9_]+)\\["?([^"\\]]+)"?\\]/);
      if (bracketM) { nodeMap[bracketM[1]] = bracketM[2]; continue; }
      const braceM = line.match(/^([A-Za-z0-9_]+)\\{"?([^"\\}]+)"?\\}/);
      if (braceM) { nodeMap[braceM[1]] = '\u25c6 ' + braceM[2]; continue; }
      const parenM = line.match(/^([A-Za-z0-9_]+)\\("?([^"\\)]+)"?\\)/);
      if (parenM) { nodeMap[parenM[1]] = parenM[2]; continue; }
    }

    const nodeIds = Object.keys(nodeMap);
    if (!nodeIds.length) return null;

    // -- Layout: top-down layering --------------------------------
    const layers = computeLayers(nodeIds, edges);
    const W = 260, nodeW = 110, nodeH = 32, hGap = 24, vGap = 48;
    const maxPerRow = Math.max(...layers.map(l => l.length));
    const svgW = Math.max(W, maxPerRow * (nodeW + hGap) + hGap);
    const svgH = layers.length * (nodeH + vGap) + vGap;

    // assign coordinates
    const coords = {};
    layers.forEach((layer, li) => {
      const rowW = layer.length * (nodeW + hGap) - hGap;
      const startX = (svgW - rowW) / 2;
      layer.forEach((id, ci) => {
        coords[id] = { x: startX + ci * (nodeW + hGap) + nodeW / 2, y: vGap + li * (nodeH + vGap) + nodeH / 2 };
      });
    });

    // -- Build SVG ------------------------------------------------
    const ACCENT = '#569cd6';
    const NODE_FILL = 'rgba(86,156,214,0.12)';
    const NODE_STROKE = '#569cd6';
    const DIAMOND_FILL = 'rgba(220,220,170,0.12)';
    const DIAMOND_STROKE = '#dcdcaa';
    const TEXT_COLOR = 'rgba(255,255,255,0.88)';
    const EDGE_COLOR = 'rgba(255,255,255,0.28)';
    const EDGE_ANIM_COLOR = '#569cd6';

    let svgParts = [
      \`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 \${svgW} \${svgH}" width="\${svgW}" height="\${svgH}" style="max-width:100%;font-family:var(--vscode-font-family,'Segoe UI',sans-serif)">\`,
      \`<defs>
        <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="\${EDGE_COLOR}" />
        </marker>
        <marker id="arrowhead-anim" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
          <polygon points="0 0, 8 3, 0 6" fill="\${EDGE_ANIM_COLOR}" />
        </marker>
        <style>
          .flow-edge { stroke: \${EDGE_COLOR}; stroke-width: 1.2; fill: none; marker-end: url(#arrowhead); }
          .flow-edge-anim { stroke: \${EDGE_ANIM_COLOR}; stroke-width: 1.5; fill: none; marker-end: url(#arrowhead-anim);
            stroke-dasharray: 6 4; animation: flowDash 1.4s linear infinite; opacity: 0; }
          .flow-node-rect:hover ~ .flow-edge-anim, .flow-edge:hover { opacity: 1; }
          @keyframes flowDash { to { stroke-dashoffset: -20; } }
          .flow-node-rect { transition: filter 0.15s; cursor: default; }
          .flow-node-rect:hover { filter: brightness(1.35); }
        </style>
      </defs>\`
    ];

    // draw edges first (behind nodes)
    for (const e of edges) {
      const a = coords[e.from], b = coords[e.to];
      if (!a || !b) continue;
      // straight line with slight curve
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const path = \`M \${a.x} \${a.y + nodeH / 2} C \${a.x} \${my + 10}, \${b.x} \${my - 10}, \${b.x} \${b.y - nodeH / 2}\`;
      svgParts.push(\`<path class="flow-edge" d="\${path}"/>\`);
      // animated dashed overlay
      svgParts.push(\`<path class="flow-edge-anim" d="\${path}"/>\`);
      if (e.label) {
        svgParts.push(\`<text x="\${mx}" y="\${my - 3}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.55)" font-style="italic">\${escHtml(e.label.slice(0,16))}</text>\`);
      }
    }

    // draw nodes
    for (const id of nodeIds) {
      const c = coords[id];
      if (!c) continue;
      const label = nodeMap[id] || id;
      const isDiamond = label.startsWith('\u25c6 ');
      const dispLabel = isDiamond ? label.slice(2) : label;
      const fill = isDiamond ? DIAMOND_FILL : NODE_FILL;
      const stroke = isDiamond ? DIAMOND_STROKE : NODE_STROKE;
      if (isDiamond) {
        const hw = nodeW / 2, hh = nodeH / 2 + 4;
        svgParts.push(\`<polygon class="flow-node-rect" points="\${c.x},\${c.y - hh} \${c.x + hw},\${c.y} \${c.x},\${c.y + hh} \${c.x - hw},\${c.y}" fill="\${fill}" stroke="\${stroke}" stroke-width="1.2" rx="3"/>\`);
      } else {
        svgParts.push(\`<rect class="flow-node-rect" x="\${c.x - nodeW / 2}" y="\${c.y - nodeH / 2}" width="\${nodeW}" height="\${nodeH}" rx="4" fill="\${fill}" stroke="\${stroke}" stroke-width="1.2"/>\`);
      }
      // truncate label
      const maxChars = 15;
      const tLabel = dispLabel.length > maxChars ? dispLabel.slice(0, maxChars - 1) + '\u2026' : dispLabel;
      svgParts.push(\`<text x="\${c.x}" y="\${c.y + 4}" text-anchor="middle" font-size="10" fill="\${TEXT_COLOR}" font-weight="500">\${escHtml(tLabel)}</text>\`);
    }

    svgParts.push('</svg>');
    return svgParts.join('\\n');
  } catch (e) {
    return null;
  }
}

function computeLayers(nodeIds, edges) {
  // Kahn's algorithm for topological layering
  const inDeg = {};
  nodeIds.forEach(id => { inDeg[id] = 0; });
  edges.forEach(e => { if (inDeg[e.to] !== undefined) inDeg[e.to]++; });
  const layers = [];
  let remaining = new Set(nodeIds);
  while (remaining.size > 0) {
    const layer = [...remaining].filter(id => inDeg[id] === 0);
    if (!layer.length) { layers.push([...remaining]); break; } // cycle fallback
    layers.push(layer);
    layer.forEach(id => {
      remaining.delete(id);
      edges.filter(e => e.from === id).forEach(e => { if (inDeg[e.to] !== undefined) inDeg[e.to]--; });
    });
  }
  return layers;
}

// -- Show / hide -----------------------------------------------

function showFlowMap(flowMap) {
  _currentFlowMap = flowMap;
  document.getElementById('flow-empty').style.display = 'none';
  document.getElementById('flow-ready').style.display = 'flex';
  closeFlowDetail();
  renderFlowTiles();
}

function renderFlowTiles() {
  if (!_currentFlowMap) return;
  const tiles = document.getElementById('flow-tiles');
  tiles.innerHTML = '';
  // Overview tile first
  if (_currentFlowMap.overviewMermaid) {
    tiles.appendChild(buildFlowTile({
      id: '__overview', title: 'Overview', category: 'service',
      description: 'How the flows connect to each other',
      mermaidCode: _currentFlowMap.overviewMermaid, relatedFiles: []
    }));
  }
  (_currentFlowMap.subDiagrams || []).forEach(d => tiles.appendChild(buildFlowTile(d)));
}

const CAT_COLORS = { auth:'#f48771', api:'#569cd6', data:'#4ec9b0', component:'#c586c0', service:'#dcdcaa', background:'#9cdcfe', custom:'#d7ba7d' };

function buildFlowTile(diagram) {
  const color = CAT_COLORS[diagram.category] || '#9cdcfe';
  const div = document.createElement('div');
  div.className = 'card';
  div.style.cssText = 'cursor:pointer;border-left:3px solid ' + color + ';transition:border-color 0.15s,background 0.15s';
  div.innerHTML =
    '<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">' +
      '<span style="font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:' + color + '">' + escHtml(diagram.category) + '</span>' +
    '</div>' +
    '<div class="card-title">' + escHtml(diagram.title) + '</div>' +
    '<div class="card-body" style="margin-top:3px">' + escHtml(diagram.description) + '</div>' +
    (diagram.relatedFiles && diagram.relatedFiles.length
      ? '<div style="margin-top:5px;font-size:9.5px;color:var(--vscode-descriptionForeground)">' +
          diagram.relatedFiles.slice(0,3).map(f => '<code style="font-size:9px">' + escHtml(f.split('/').pop()) + '</code>').join(' ') +
        '</div>' : '') +
    '<div style="margin-top:6px;font-size:9.5px;color:' + color + ';opacity:0.7">Click to view diagram \u203a</div>';
  div.addEventListener('click', () => openFlowDetail(diagram));
  div.addEventListener('mouseenter', () => div.style.background = 'var(--vscode-list-hoverBackground)');
  div.addEventListener('mouseleave', () => div.style.background = '');
  return div;
}

function openFlowDetail(diagram) {
  _selectedDiagram = diagram;
  const color = CAT_COLORS[diagram.category] || '#9cdcfe';

  // Show detail panel, hide overview
  document.getElementById('flow-overview').style.display = 'none';
  document.getElementById('flow-detail').style.display = 'flex';
  document.getElementById('flow-detail-title').textContent = diagram.title;
  document.getElementById('flow-detail-desc').textContent = diagram.description;
  document.getElementById('flow-mermaid-src').textContent = diagram.mermaidCode;

  // Related files
  const rf = document.getElementById('flow-related-files');
  rf.innerHTML = diagram.relatedFiles && diagram.relatedFiles.length
    ? '<b>Related files:</b> ' + diagram.relatedFiles.map(f => '<code>' + escHtml(f) + '</code>').join(', ')
    : '';

  // Render SVG
  const container = document.getElementById('flow-svg-container');
  container.innerHTML = '<div style="font-size:10px;color:var(--vscode-descriptionForeground)">Rendering\u2026</div>';
  setTimeout(() => {
    const svg = renderMermaidToSvg(diagram.mermaidCode);
    if (svg) {
      container.innerHTML = svg;
      // animate edges on hover via CSS already in defs; trigger initial fade-in
      container.style.opacity = '0';
      container.style.transition = 'opacity 0.3s';
      requestAnimationFrame(() => { container.style.opacity = '1'; });
    } else {
      container.innerHTML =
        '<div style="text-align:center;padding:12px">' +
        '<div style="font-size:11px;color:var(--vscode-descriptionForeground);margin-bottom:6px">Visual render unavailable \u2014 Mermaid source below</div>' +
        '<div style="font-size:10px;color:' + color + '">Expand "View Mermaid source" to copy and paste into mermaid.live</div>' +
        '</div>';
    }
  }, 30);

  // Copy button
  document.getElementById('flow-copy-btn').onclick = () => {
    navigator.clipboard?.writeText(diagram.mermaidCode).then(() => {
      const btn = document.getElementById('flow-copy-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
    });
  };
}

function closeFlowDetail() {
  _selectedDiagram = null;
  document.getElementById('flow-detail').style.display = 'none';
  document.getElementById('flow-overview').style.display = 'flex';
  // Reset SVG container
  const c = document.getElementById('flow-svg-container');
  if (c) { c.innerHTML = ''; c.style.opacity = '1'; }
}

function addCustomFlowTile(diagram) {
  if (_currentFlowMap) {
    _currentFlowMap.subDiagrams.unshift(diagram);
  } else {
    _currentFlowMap = { subDiagrams: [diagram], overviewMermaid: '' };
  }
  document.getElementById('flow-empty').style.display = 'none';
  document.getElementById('flow-ready').style.display = 'flex';
  renderFlowTiles();
  // Auto-open the new diagram
  openFlowDetail(diagram);
}

function askCustomFlow() {
  const inp = document.getElementById('flow-question');
  const q = inp ? inp.value.trim() : '';
  if (!q) return;
  inp.value = '';
  if (vscode) vscode.postMessage({ type: 'generateCustomFlow', payload: { question: q } });
}

// Wire preset buttons after DOM load (called from INIT block)
function wireFlowPresets() {
  document.querySelectorAll('.flow-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      const q = btn.getAttribute('data-q');
      if (q && vscode) vscode.postMessage({ type: 'generateCustomFlow', payload: { question: q } });
    });
  });
  // Enter key on flow input
  const fi = document.getElementById('flow-question');
  if (fi) fi.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); askCustomFlow(); } });
}
</script>
</body>
</html>`;
}
