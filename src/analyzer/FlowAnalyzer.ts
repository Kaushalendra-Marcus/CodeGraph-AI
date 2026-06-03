import { WorkspaceFile } from "./WorkspaceScanner";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CallChain {
  from: string;   // file path
  to: string;     // file path
  method: string; // function/method name detected
}

export interface RouteDefinition {
  method: string;   // GET POST PUT DELETE PATCH
  path: string;     // "/api/users"
  handler: string;  // function/controller name
  file: string;
}

export interface FlowContext {
  callChains: CallChain[];
  routes: RouteDefinition[];
  eventEmitters: { file: string; event: string }[];
  dbAccess: { file: string; operation: string }[];
}

// ── Patterns ───────────────────────────────────────────────────────────────

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "all", "use"];

const DB_PATTERNS = [
  /\.find\(/, /\.findOne\(/, /\.save\(/, /\.create\(/, /\.update\(/,
  /\.delete\(/, /\.query\(/, /\.exec\(/, /\.aggregate\(/, /\.insert\(/,
  /prisma\.\w+\.(find|create|update|delete)/, /\.from\(['"]\w+['"]\)/,
];

const EMIT_PATTERNS = [
  /\.emit\(['"]([\w:.-]+)['"]/g,
  /\.publish\(['"]([\w:.-]+)['"]/g,
  /EventEmitter.*emit\(['"]([\w:.-]+)['"]/g,
];

// ── Main function ──────────────────────────────────────────────────────────

export function analyzeFlows(files: WorkspaceFile[]): FlowContext {
  const callChains: CallChain[] = [];
  const routes: RouteDefinition[] = [];
  const eventEmitters: { file: string; event: string }[] = [];
  const dbAccess: { file: string; operation: string }[] = [];

  for (const file of files) {
    extractRoutes(file, routes);
    extractEventEmits(file, eventEmitters);
    extractDbAccess(file, dbAccess);
  }

  // Build call chains from routes → their likely service files
  for (const route of routes) {
    const handlerLower = route.handler.toLowerCase();
    for (const file of files) {
      const fileLower = file.path.toLowerCase();
      // If a service/controller file name matches the handler
      if (
        fileLower.includes("service") ||
        fileLower.includes("controller") ||
        fileLower.includes("handler")
      ) {
        if (file.content.includes(route.handler)) {
          callChains.push({
            from: route.file,
            to: file.path,
            method: route.handler,
          });
        }
      }
    }
  }

  // Build call chains from function calls between files
  for (const file of files) {
    const importedFrom = extractImportedIdentifiers(file.content);
    for (const id of importedFrom) {
      for (const other of files) {
        if (other.path === file.path) continue;
        // Check if the imported name appears as an export in another file
        if (
          other.content.match(
            new RegExp(`export\\s+(?:default\\s+)?(?:class|function|const)\\s+${id}\\b`)
          )
        ) {
          callChains.push({ from: file.path, to: other.path, method: id });
        }
      }
    }
  }

  return {
    callChains: dedupeCallChains(callChains).slice(0, 100),
    routes,
    eventEmitters,
    dbAccess,
  };
}

// ── Extractors ─────────────────────────────────────────────────────────────

function extractRoutes(file: WorkspaceFile, out: RouteDefinition[]) {
  // Express-style: router.get('/path', handler)  or  app.post('/path', ...)
  const routeRe =
    /(?:router|app|Route)\s*\.\s*(get|post|put|patch|delete|all)\s*\(\s*['"]([^'"]+)['"]\s*,\s*([\w.]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = routeRe.exec(file.content)) !== null) {
    out.push({
      method: m[1].toUpperCase(),
      path: m[2],
      handler: m[3],
      file: file.path,
    });
  }

  // Decorator-style: @Get('/path')  @Post('/path')  (NestJS / TypeScript)
  const decoratorRe = /@(Get|Post|Put|Patch|Delete)\s*\(\s*['"]([^'"]*)['"]\s*\)/g;
  while ((m = decoratorRe.exec(file.content)) !== null) {
    // Find the method name that follows the decorator
    const after = file.content.slice(m.index + m[0].length, m.index + m[0].length + 120);
    const methodMatch = after.match(/(?:async\s+)?(\w+)\s*\(/);
    out.push({
      method: m[1].toUpperCase(),
      path: m[2] || "/",
      handler: methodMatch?.[1] || "unknown",
      file: file.path,
    });
  }
}

function extractEventEmits(file: WorkspaceFile, out: { file: string; event: string }[]) {
  for (const pattern of EMIT_PATTERNS) {
    let m: RegExpExecArray | null;
    const re = new RegExp(pattern.source, pattern.flags);
    while ((m = re.exec(file.content)) !== null) {
      if (m[1]) out.push({ file: file.path, event: m[1] });
    }
  }
}

function extractDbAccess(file: WorkspaceFile, out: { file: string; operation: string }[]) {
  for (const pattern of DB_PATTERNS) {
    if (pattern.test(file.content)) {
      const op = pattern.source.replace(/[\\^$()|*+?{}[\].]/g, "").replace(/\\\./g, ".").slice(0, 30);
      out.push({ file: file.path, operation: op });
      break; // one entry per file per category is enough
    }
  }
}

function extractImportedIdentifiers(content: string): string[] {
  const ids = new Set<string>();
  // import { Foo, Bar } from '...'
  const namedRe = /import\s+\{([^}]+)\}\s+from/g;
  let m: RegExpExecArray | null;
  while ((m = namedRe.exec(content)) !== null) {
    for (const part of m[1].split(",")) {
      const id = part.trim().split(/\s+as\s+/).pop()?.trim();
      if (id && /^[A-Z]/.test(id)) ids.add(id); // Only exported class/service names (PascalCase)
    }
  }
  return [...ids];
}

function dedupeCallChains(chains: CallChain[]): CallChain[] {
  const seen = new Set<string>();
  return chains.filter((c) => {
    const key = `${c.from}→${c.to}→${c.method}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
