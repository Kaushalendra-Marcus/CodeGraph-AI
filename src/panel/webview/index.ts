import * as fs   from "fs";
import * as path from "path";

export interface WebviewParams {
  cspSource: string;
  iconUris: Record<string, string>;
}

/**
 * Assembles the full webview HTML by reading the pre-built bundle
 * produced by scripts/build-webview.js, then injecting VS Code
 * runtime values (CSP nonce, icon URIs, etc.).
 */
export function getWebviewContent(params: WebviewParams): string {
  const { cspSource, iconUris } = params;

  // Read the pre-built bundle (created by `npm run build:webview`)
  const bundlePath = path.join(__dirname, "..", "..", "webview-bundle.html");

  let template: string;
  try {
    template = fs.readFileSync(bundlePath, "utf8");
  } catch {
    // Bundle not built yet — return a clear error page
    return buildErrorPage(cspSource, "Run `npm run build:webview` first to generate the webview bundle.");
  }

  // Inject runtime values
  return template
    .replace("__CSP_SOURCE__", cspSource)
    .replace("__ICON_URIS__", JSON.stringify(iconUris));
}

function buildErrorPage(cspSource: string, message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
  <style>
    body { background:#1e1e1e; color:#f44747; font-family:'Segoe UI',sans-serif;
           display:flex; align-items:center; justify-content:center; height:100vh; margin:0; }
    .msg { text-align:center; }
    code { background:#252526; padding:4px 8px; border-radius:3px; color:#4ec9b0; }
  </style>
</head>
<body>
  <div class="msg">
    <div style="font-size:14px;font-weight:600;margin-bottom:8px">Build step required</div>
    <div style="font-size:12px">${message}</div>
  </div>
</body>
</html>`;
}
