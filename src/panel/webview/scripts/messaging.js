/* messaging.js — all window.postMessage handlers from the extension */

const fileSummaryMap = {};
let _summary = null;
let _repoName = '';
let _refactorContent = '';
let _prContent = '';

const STEP_PCT = { 1: 15, 2: 40, 3: 65, 4: 85, 5: 95 };

window.addEventListener('message', e => {
  const { type, payload } = e.data;

  switch (type) {
    // ── Workspace ──
    case 'workspaceStatus':
      if (payload.hasWorkspace) {
        document.getElementById('ws-name').textContent = payload.name;
        document.getElementById('ws-sub').textContent  = 'Ready to analyze. Click the button below.';
      }
      break;

    // ── Analysis progress ──
    case 'progress':
      setProgress(payload.step, STEP_PCT[payload.step] || 10, payload.message);
      break;

    case 'graphReady':
      setProgress(2, 40, 'Graph built!');
      initGraph(payload);
      break;

    case 'summaryReady':
      _summary = payload;
      setProgress(3, 65, 'Summary generated!');
      break;

    case 'fileSummariesReady':
      setProgress(4, 88, 'File summaries done!');
      showFileSummaries(payload);
      break;

    case 'flowMapReady':
      setProgress(5, 96, 'Flow diagrams ready!');
      renderFlowMap(payload);
      break;

    case 'analysisComplete':
      _repoName = payload.repoName;
      setProgress(5, 100, 'Analysis complete!');
      setAnalyzing(false);
      if (_summary) showSummary(_summary, _repoName);
      enableQA();
      showAlert('analyze', '✓ Done! Open Graph, Summary, Flow and Q&A tabs.', 'success');
      break;

    case 'analysisRestored':
      _repoName = payload.repoName;
      _summary  = payload.summary;
      setAnalyzing(false);
      initGraph(payload.graph);
      showFileSummaries(payload.fileSummaries || []);
      if (_summary) showSummary(_summary, _repoName);
      if (payload.flowMap) renderFlowMap(payload.flowMap);
      if (payload.hasQA) enableQA();
      showAlert('analyze', '✓ Restored previous analysis.', 'success');
      break;

    // ── Q&A ──
    case 'answer':
      removeThinking();
      addMsg('ai', payload.answer);
      break;

    // ── Settings ──
    case 'providerSaved':
      showAlert('settings', '✓ Provider saved: ' + payload.name, 'success');
      break;

    case 'settingsLoaded':
      applySettingsLoaded(payload);
      break;

    // ── History ──
    case 'historyLoaded':
      showHistory(payload.records);
      break;

    // ── AI Tools ──
    case 'aiToolBusy':
      setAIToolBusy(payload.docType, payload.busy);
      break;

    case 'aiToolError':
      showAlert('aitools', '✗ ' + payload.message, 'error');
      break;

    case 'docSaved':
      showAlert('aitools', '✓ Saved: ' + (payload.filename || payload.docType), 'success');
      break;

    case 'refactorResult':
      _refactorContent = payload.content;
      document.getElementById('refactor-content').textContent = payload.content;
      document.getElementById('refactor-result').style.display = 'block';
      break;

    case 'prReviewResult':
      _prContent = payload.content;
      document.getElementById('pr-content').textContent = payload.content;
      document.getElementById('pr-result').style.display = 'block';
      break;

    case 'tokenUsage':
      updateTokenDisplay(payload.total);
      break;

    case 'layoutLoaded':
      applyLayout(payload.positions);
      break;

    // ── Flow (custom diagram response) ──
    case 'customFlowReady':
      addCustomFlowTile(payload);
      openFlowDetail(payload);
      break;

    // ── Errors ──
    case 'error':
      setAnalyzing(false);
      showAlert('analyze',  '✗ ' + payload.message, 'error');
      showAlert('settings', '✗ ' + payload.message, 'error');
      break;
  }
});
