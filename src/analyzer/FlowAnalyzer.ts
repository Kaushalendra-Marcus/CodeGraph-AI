import { WorkspaceFile } from "./WorkspaceScanner";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CallChain {
  from: string;        // file path
  to: string;          // file path
  method: string;      // the imported identifier that connects them
  kind: "import" | "route" | "event" | "dynamic";
}

export interface RouteDefinition {
  httpMethod: string;  // GET POST PUT DELETE PATCH
  path: string;        // "/api/users/:id"
  handler: string;     // function or controller method name
  controller?: string; // class name if decorator style
  file: string;
  middlewares: string[];
}

export interface EventFlow {
  emitFile: string;
  event: string;
  listenerFiles: string[];
}

export interface DbAccessPattern {
  file: string;
  orm: string;       // "prisma" | "mongoose" | "typeorm" | "sequelize" | "raw-sql" | "knex"
  operations: string[]; // ["findMany", "create", "update"]
  models: string[];  // ["User", "Post"] — detected model names
}

export interface FunctionSignature {
  name: string;
  isAsync: boolean;
  isExported: boolean;
  params: string[];
  file: string;
}

export interface FlowContext {
  callChains: CallChain[];
  routes: RouteDefinition[];
  eventFlows: EventFlow[];
  dbAccess: DbAccessPattern[];
  functions: FunctionSignature[];   // key exported functions across the codebase
  middlewareStack: { file: string; names: string[] }[];
  // Serialisable snapshot handed to AI
  summary: FlowContextSummary;
}

export interface FlowContextSummary {
  routeCount: number;
  routes: string[];                 // "GET /api/users → UserController.getAll (src/...)"
  callChainLines: string[];         // "src/auth/auth.service.ts → src/users/user.service.ts (UserService)"
  eventLines: string[];             // "src/orders/order.service.ts emits 'order.created' → [src/email/...]"
  dbLines: string[];                // "src/users/user.service.ts: Prisma → findMany, create [User]"
  middlewareLines: string[];
  exportedFunctions: string[];      // "src/auth/auth.service.ts: validateUser, signToken, refreshToken"
}

// ── Entry point ────────────────────────────────────────────────────────────

export function analyzeFlows(files: WorkspaceFile[]): FlowContext {
  const routes: RouteDefinition[]    = [];
  const dbAccess: DbAccessPattern[]  = [];
  const functions: FunctionSignature[] = [];
  const middlewareStack: { file: string; names: string[] }[] = [];
  const emitMap = new Map<string, { file: string; event: string }[]>();
  const listenMap = new Map<string, string[]>();   // event → listener files

  for (const file of files) {
    extractRoutes(file, routes);
    extractDbAccess(file, dbAccess);
    extractFunctions(file, functions);
    extractMiddleware(file, middlewareStack);
    extractEventEmits(file, emitMap);
    extractEventListeners(file, listenMap);
  }

  // Build event flow objects
  const eventFlows: EventFlow[] = [];
  for (const [event, emitters] of emitMap) {
    eventFlows.push({
      emitFile: emitters[0].file,
      event,
      listenerFiles: listenMap.get(event) || [],
    });
  }

  // Build call chains from actual import → export matching
  const callChains = buildCallChains(files, routes);

  const ctx: FlowContext = {
    callChains: callChains.slice(0, 120),
    routes,
    eventFlows,
    dbAccess,
    functions,
    middlewareStack,
    summary: buildSummary(routes, callChains, eventFlows, dbAccess, middlewareStack, functions),
  };

  return ctx;
}

// ── Route extraction ──────────────────────────────────────────────────────

function extractRoutes(file: WorkspaceFile, out: RouteDefinition[]) {
  const content = file.content;

  // Express/Fastify/Hapi style: router.get('/path', middleware, handler)
  const expressRe = /(?:router|app|server|fastify)\s*\.\s*(get|post|put|patch|delete|all|use)\s*\(\s*['"`]([^'"`]+)['"`]\s*,([^)]+)\)/gi;
  let m: RegExpExecArray | null;
  while ((m = expressRe.exec(content)) !== null) {
    const fnParts = m[3].split(",").map((s) => s.trim().replace(/\s*async\s*/, "")).filter(Boolean);
    const handler = fnParts[fnParts.length - 1] || "anonymous";
    const middlewares = fnParts.slice(0, -1);
    out.push({ httpMethod: m[1].toUpperCase(), path: m[2], handler, file: file.path, middlewares });
  }

  // NestJS/TypeScript decorator style: @Get('/path') async methodName(
  const decoratorRe = /@(Get|Post|Put|Patch|Delete|All)\s*\(\s*['"`]?([^'"`\s)]*)['"`]?\s*\)\s*\n?\s*(?:@\w+[^\n]*\n\s*)*(?:async\s+)?(\w+)\s*\(/g;
  while ((m = decoratorRe.exec(content)) !== null) {
    // Try to detect the controller class name
    const before = content.slice(0, m.index);
    const classMatch = before.match(/(?:@Controller\([^)]*\)\s*\n\s*)?export\s+class\s+(\w+)/g);
    const controller = classMatch ? classMatch[classMatch.length - 1].replace(/.*class\s+/, "").trim() : undefined;
    out.push({ httpMethod: m[1].toUpperCase(), path: m[2] || "/", handler: m[3], controller, file: file.path, middlewares: [] });
  }

  // Next.js API routes: export default function handler or export async function GET
  if (file.path.includes("/pages/api/") || file.path.includes("/app/api/") || file.path.includes("/route.ts") || file.path.includes("/route.js")) {
    const nextRe = /export\s+(?:default\s+)?(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|handler)\s*\(/g;
    while ((m = nextRe.exec(content)) !== null) {
      const httpMethod = m[1] === "handler" ? "ALL" : m[1];
      const routePath  = file.path.replace(/.*\/pages\/api|.*\/app\/api/, "").replace(/\.(ts|js)x?$/, "").replace(/\/route$/, "") || "/";
      out.push({ httpMethod, path: routePath, handler: m[1], file: file.path, middlewares: [] });
    }
  }
}

// ── DB access extraction ──────────────────────────────────────────────────

const ORM_SIGNATURES: { orm: string; pattern: RegExp; modelPattern?: RegExp }[] = [
  { orm: "prisma",    pattern: /prisma\.(\w+)\.(findMany|findFirst|findUnique|create|createMany|update|updateMany|delete|deleteMany|upsert|count|aggregate)/g, modelPattern: /prisma\.(\w+)\./g },
  { orm: "mongoose",  pattern: /(\w+Model|new \w+|Model)\.(?:find|findOne|findById|save|create|updateOne|updateMany|deleteOne|deleteMany|aggregate|populate)\(/g },
  { orm: "typeorm",   pattern: /(?:getRepository|repository|this\.\w+Repository|\.createQueryBuilder)\s*[.(]/g },
  { orm: "sequelize", pattern: /(\w+)\.(?:findAll|findOne|findByPk|create|update|destroy|upsert|bulkCreate)\s*\(/g },
  { orm: "knex",      pattern: /knex\s*\(\s*['"`](\w+)['"`]\s*\)|\.from\s*\(\s*['"`](\w+)['"`]\s*\)/g },
  { orm: "raw-sql",   pattern: /(?:db|pool|connection|client)\s*\.(?:query|execute|run)\s*\(\s*['"`]/g },
];

function extractDbAccess(file: WorkspaceFile, out: DbAccessPattern[]) {
  const content = file.content;
  const existing = out.find((d) => d.file === file.path);

  for (const sig of ORM_SIGNATURES) {
    if (!sig.pattern.test(content)) { sig.pattern.lastIndex = 0; continue; }
    sig.pattern.lastIndex = 0;

    const operations: string[] = [];
    const models: string[] = [];
    let m: RegExpExecArray | null;

    // Extract operations
    const opRe = new RegExp(sig.pattern.source, sig.pattern.flags);
    while ((m = opRe.exec(content)) !== null) {
      // For prisma: group 2 is the operation, group 1 is the model
      if (sig.orm === "prisma") {
        if (m[2]) operations.push(m[2]);
        if (m[1]) models.push(capitalize(m[1]));
      } else {
        // Generic: last capture group is often the operation
        const op = m[2] || m[1] || "query";
        operations.push(op);
      }
    }

    // Extract model names via model pattern if present
    if (sig.modelPattern) {
      const modelRe = new RegExp(sig.modelPattern.source, sig.modelPattern.flags);
      while ((m = modelRe.exec(content)) !== null) {
        if (m[1] && m[1] !== "then" && m[1] !== "catch" && m[1] !== "finally" && /^[A-Z]/.test(m[1]))
          models.push(m[1]);
      }
    }

    const uniqueOps    = [...new Set(operations)].slice(0, 8);
    const uniqueModels = [...new Set(models)].slice(0, 6);

    if (uniqueOps.length === 0 && uniqueModels.length === 0) continue;

    if (existing) {
      existing.operations.push(...uniqueOps);
      existing.models.push(...uniqueModels);
    } else {
      out.push({ file: file.path, orm: sig.orm, operations: uniqueOps, models: uniqueModels });
    }
    break; // one ORM per file is enough
  }
}

// ── Function/class extraction ─────────────────────────────────────────────

function extractFunctions(file: WorkspaceFile, out: FunctionSignature[]) {
  const content = file.content;
  // Only extract from source files that export things
  if (!content.includes("export")) return;

  const patterns: RegExp[] = [
    /(?:export\s+)?(async\s+)?function\s+(\w+)\s*\(([^)]*)\)/g,
    /export\s+const\s+(\w+)\s*=\s*(async\s+)?\(([^)]*)\)\s*=>/g,
    /export\s+class\s+(\w+)/g,
  ];

  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const isExported = m[0].startsWith("export");
      const isAsync    = m[0].includes("async");
      let name: string, params: string[];

      if (m[0].includes("class")) {
        name   = m[1];
        params = [];
      } else if (m[0].includes("const")) {
        name   = m[1];
        params = (m[3] || "").split(",").map((p) => p.trim().split(":")[0].trim()).filter(Boolean);
      } else {
        name   = m[2];
        params = (m[3] || "").split(",").map((p) => p.trim().split(":")[0].trim()).filter(Boolean);
      }

      if (!name || name.length < 2) continue;
      out.push({ name, isAsync, isExported, params: params.slice(0, 4), file: file.path });
    }
  }
}

// ── Middleware extraction ─────────────────────────────────────────────────

function extractMiddleware(file: WorkspaceFile, out: { file: string; names: string[] }[]) {
  const content = file.content;
  const names: string[] = [];

  // app.use(middleware) — single line
  const useRe = /(?:app|router|server)\s*\.use\s*\(\s*([\w.]+)\s*(?:,|\))/g;
  let m: RegExpExecArray | null;
  while ((m = useRe.exec(content)) !== null) {
    if (m[1] && !/['"`]/.test(m[1])) names.push(m[1]);
  }

  // NestJS guards / interceptors / pipes
  const nestRe = /@Use(?:Guards|Interceptors|Pipes)\s*\(([^)]+)\)/g;
  while ((m = nestRe.exec(content)) !== null) {
    m[1].split(",").map((s) => s.trim()).filter(Boolean).forEach((n) => names.push(n));
  }

  if (names.length > 0) out.push({ file: file.path, names: [...new Set(names)] });
}

// ── Event extraction ──────────────────────────────────────────────────────

function extractEventEmits(file: WorkspaceFile, map: Map<string, { file: string; event: string }[]>) {
  const emitPatterns = [
    /\.emit\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    /\.publish\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    /EventBus\.(?:emit|publish)\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    /new\s+\w+Event\s*\(/g,  // NestJS event objects
  ];
  for (const re of emitPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content)) !== null) {
      if (!m[1]) continue;
      const existing = map.get(m[1]) || [];
      existing.push({ file: file.path, event: m[1] });
      map.set(m[1], existing);
    }
  }
}

function extractEventListeners(file: WorkspaceFile, map: Map<string, string[]>) {
  const listenPatterns = [
    /\.on\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    /\.subscribe\s*\(\s*['"`]([\w:.-]+)['"`]/g,
    /@(?:On|Subscribe|EventPattern)\s*\(\s*['"`]([\w:.-]+)['"`]/g,
  ];
  for (const re of listenPatterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content)) !== null) {
      if (!m[1]) continue;
      const existing = map.get(m[1]) || [];
      if (!existing.includes(file.path)) existing.push(file.path);
      map.set(m[1], existing);
    }
  }
}

// ── Call chain builder ────────────────────────────────────────────────────

function buildCallChains(files: WorkspaceFile[], routes: RouteDefinition[]): CallChain[] {
  const chains: CallChain[] = [];
  const seen = new Set<string>();

  // Build export index: exported name → file path
  const exportIndex = new Map<string, string>();
  for (const file of files) {
    const re = /export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(file.content)) !== null) {
      exportIndex.set(m[1], file.path);
    }
  }

  for (const file of files) {
    // Named imports: import { Foo, Bar } from './something'
    const namedRe = /import\s+\{([^}]+)\}\s+from\s+['"`]([^'"`]+)['"`]/g;
    let m: RegExpExecArray | null;
    while ((m = namedRe.exec(file.content)) !== null) {
      const importPath = m[2];
      const names = m[1].split(",").map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean);
      for (const name of names) {
        const targetFile = exportIndex.get(name);
        if (!targetFile || targetFile === file.path) continue;
        const key = `${file.path}→${targetFile}→${name}`;
        if (!seen.has(key)) { seen.add(key); chains.push({ from: file.path, to: targetFile, method: name, kind: "import" }); }
      }
    }

    // Default imports: import Foo from './something'
    const defaultRe = /import\s+(\w+)\s+from\s+['"`]([^'"`]+)['"`]/g;
    while ((m = defaultRe.exec(file.content)) !== null) {
      const name = m[1];
      if (/^(React|Vue|express|path|fs|http|https|os|util)$/.test(name)) continue;
      const targetFile = exportIndex.get(name);
      if (!targetFile || targetFile === file.path) continue;
      const key = `${file.path}→${targetFile}→${name}`;
      if (!seen.has(key)) { seen.add(key); chains.push({ from: file.path, to: targetFile, method: name, kind: "import" }); }
    }
  }

  // Route → handler file chains
  for (const route of routes) {
    const handlerFile = exportIndex.get(route.handler);
    if (handlerFile && handlerFile !== route.file) {
      const key = `${route.file}→${handlerFile}→${route.handler}`;
      if (!seen.has(key)) { seen.add(key); chains.push({ from: route.file, to: handlerFile, method: route.handler, kind: "route" }); }
    }
  }

  return chains;
}

// ── Summary builder (what gets sent to the AI) ────────────────────────────

function buildSummary(
  routes: RouteDefinition[],
  chains: CallChain[],
  events: EventFlow[],
  db: DbAccessPattern[],
  mw: { file: string; names: string[] }[],
  fns: FunctionSignature[]
): FlowContextSummary {
  const routeLines = routes.slice(0, 30).map((r) => {
    const ctrl = r.controller ? ` (${r.controller}.${r.handler})` : ` → ${r.handler}`;
    const mws = r.middlewares.length ? ` [mw: ${r.middlewares.slice(0, 2).join(", ")}]` : "";
    return `${r.httpMethod} ${r.path}${ctrl}${mws} — ${r.file}`;
  });

  const chainLines = chains.slice(0, 40).map((c) =>
    `${c.file.split("/").slice(-2).join("/")} → ${c.to.split("/").slice(-2).join("/")} via ${c.method}`
  );

  const eventLines = events.slice(0, 15).map((e) => {
    const listeners = e.listenerFiles.length ? ` → [${e.listenerFiles.slice(0, 3).map((f) => f.split("/").pop()).join(", ")}]` : " → (no listeners found)";
    return `${e.emitFile.split("/").pop()} emits '${e.event}'${listeners}`;
  });

  const dbLines = db.slice(0, 20).map((d) => {
    const models = d.models.length ? ` [${d.models.slice(0, 4).join(", ")}]` : "";
    return `${d.file.split("/").slice(-2).join("/")}: ${d.orm} → ${d.operations.slice(0, 4).join(", ")}${models}`;
  });

  const mwLines = mw.slice(0, 10).map((m) => `${m.file.split("/").pop()}: ${m.names.join(", ")}`);

  // Group exported functions by file
  const fnByFile = new Map<string, string[]>();
  for (const fn of fns) {
    if (!fn.isExported) continue;
    const existing = fnByFile.get(fn.file) || [];
    existing.push(fn.name);
    fnByFile.set(fn.file, existing);
  }
  const fnLines = [...fnByFile.entries()].slice(0, 20).map(([file, names]) =>
    `${file.split("/").slice(-2).join("/")}: ${names.slice(0, 6).join(", ")}`
  );

  return {
    routeCount: routes.length,
    routes: routeLines,
    callChainLines: chainLines,
    eventLines,
    dbLines,
    middlewareLines: mwLines,
    exportedFunctions: fnLines,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
