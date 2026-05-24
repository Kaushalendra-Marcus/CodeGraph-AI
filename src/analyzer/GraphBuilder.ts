import { RepoFile } from "./RepoFetcher";

export interface GraphNode {
  id: string;
  label: string;
  path: string;
  absPath?: string;
  language: string;
  size: number;
  imports: string[];
  importedBy: string[];
  exports: string[];
  group: string;
  inDegree: number;
  outDegree: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label?: string;
}

export interface DependencyGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface ImportMatch { path: string; names?: string; }

function extractImports(content: string, lang: string): ImportMatch[] {
  const results: ImportMatch[] = [];
  let m: RegExpExecArray | null;

  if (lang === "TypeScript" || lang === "JavaScript" || lang === "Vue" || lang === "Svelte") {
    const r1 = /import\s+(?:type\s+)?(?:([\w*{}\s,]+)\s+from\s+)?['"]([^'"]+)['"]/g;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[2], names: m[1]?.trim() });
    const r1b = /import\s+['"]([^'"]+)['"]/g;
    while ((m = r1b.exec(content)) !== null) results.push({ path: m[1] });
    const r1c = /import\s+\*\s+as\s+[\w$]+\s+from\s+['"]([^'"]+)['"]/g;
    while ((m = r1c.exec(content)) !== null) results.push({ path: m[1] });
    const r2 = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((m = r2.exec(content)) !== null) results.push({ path: m[1] });
    const r3 = /export\s+(?:type\s+)?(?:[\w{}\s,*]+)\s+from\s+['"]([^'"]+)['"]/g;
    while ((m = r3.exec(content)) !== null) results.push({ path: m[1] });
    const r4 = /export\s*\{[^}]+\}\s*from\s*['"]([^'"]+)['"]/g;
    while ((m = r4.exec(content)) !== null) results.push({ path: m[1] });
  } else if (lang === "Python") {
    const r1 = /^from\s+([\w.]+)\s+import\s+(.+)/gm;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1].replace(/\./g, "/"), names: m[2].trim() });
    const r2 = /^import\s+([\w.]+)/gm;
    while ((m = r2.exec(content)) !== null) results.push({ path: m[1].replace(/\./g, "/") });
  } else if (lang === "Go") {
    const r1 = /import\s+"([^"]+)"/g;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1] });
    const block = content.match(/import\s*\(([^)]+)\)/s);
    if (block) { const r2 = /"([^"]+)"/g; while ((m = r2.exec(block[1])) !== null) results.push({ path: m[1] }); }
  } else if (lang === "Rust") {
    const r1 = /use\s+([\w:]+)/g;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1].replace(/::/g, "/") });
    const r2 = /^mod\s+(\w+)\s*;/gm;
    while ((m = r2.exec(content)) !== null) results.push({ path: m[1] });
  } else if (lang === "Java") {
    const r1 = /^import\s+([\w.]+);/gm;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1].replace(/\./g, "/") });
  } else if (lang === "Ruby") {
    const r1 = /require(?:_relative)?\s+['"]([^'"]+)['"]/g;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1] });
  } else if (lang === "PHP") {
    const r1 = /(?:require|include)(?:_once)?\s+['"]([^'"]+)['"]/g;
    while ((m = r1.exec(content)) !== null) results.push({ path: m[1] });
  }

  return results;
}

function extractExports(content: string, lang: string): string[] {
  const exports: string[] = [];
  if (lang === "TypeScript" || lang === "JavaScript") {
    let m: RegExpExecArray | null;
    const r1 = /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type|enum)\s+(\w+)/g;
    while ((m = r1.exec(content)) !== null) exports.push(m[1]);
    const r2 = /export\s+\{([^}]+)\}/g;
    while ((m = r2.exec(content)) !== null) {
      exports.push(...m[1].split(",").map((s) => s.trim().split(/\s+/)[0]).filter(Boolean));
    }
  }
  return [...new Set(exports)].slice(0, 10);
}

function normalizePath(raw: string): string {
  const parts = raw.replace(/\\/g, "/").split("/");
  const out: string[] = [];
  for (const p of parts) { if (p === "..") out.pop(); else if (p !== ".") out.push(p); }
  return out.join("/");
}


function findBySuffix(base: string, allPaths: Set<string>): string | null {
  const normalized = normalizePath(base);
  // Exact match first
  if (allPaths.has(normalized)) return normalized;
  
  const matches = [...allPaths].filter((candidate) => {
    const path = normalizePath(candidate);
    // Only match if:
    // 1. Exact match
    // 2. Candidate ends with /normalized (module folder import)
    // 3. Candidate ends with /normalized.ext or /normalized/index.ext
    return path === normalized || 
           path.endsWith(`/${normalized}`) || 
           path.endsWith(`/${normalized}.ts`) || 
           path.endsWith(`/${normalized}.tsx`) || 
           path.endsWith(`/${normalized}.js`) || 
           path.endsWith(`/${normalized}.jsx`) || 
           path.endsWith(`/${normalized}.vue`) || 
           path.endsWith(`/${normalized}.svelte`) || 
           path.endsWith(`/${normalized}.py`) ||
           path === `${normalized}/index.ts` ||
           path === `${normalized}/index.tsx` ||
           path === `${normalized}/index.js` ||
           path === `${normalized}/index.jsx` ||
           path === `${normalized}/index.vue` ||
           path === `${normalized}/index.svelte` ||
           path === `${normalized}/index.py`;
  });
  if (!matches.length) return null;
  matches.sort((a, b) => a.length - b.length);
  return matches[0];
}

function resolveImport(imp: string, fromPath: string, allPaths: Set<string>): string | null {
  if (!imp.startsWith(".") && !imp.startsWith("~") && !imp.startsWith("@/") && !imp.startsWith("/")) return null;
  const fromDir = normalizePath(fromPath).split("/").slice(0, -1).join("/");
  const rawBase = imp.startsWith("@/") || imp.startsWith("~/") ? imp.slice(2) : imp.startsWith("/") ? imp.slice(1) : normalizePath(`${fromDir}/${imp}`);
  const base = normalizePath(rawBase);

  for (const candidate of expandImportCandidates(base)) {
    if (allPaths.has(candidate)) return candidate;
  }

  const suffixMatch = findBySuffix(base, allPaths);
  if (suffixMatch) return suffixMatch;
  return null;
}

export function buildDependencyGraph(
  files: Array<{ path: string; content: string; size: number; language: string; absPath?: string }>
): DependencyGraph {
  const allPaths = new Set(files.map((f) => f.path));
  const nodeMap = new Map<string, GraphNode>();

  for (const file of files) {
    const matches = extractImports(file.content, file.language);
    const exports = extractExports(file.content, file.language);
    const label = file.path.split("/").pop() || file.path;
    const parts = file.path.split("/");
    const group = parts.length > 1 ? parts[0] : "root";
    nodeMap.set(file.path, {
      id: file.path, label, path: file.path, absPath: (file as any).absPath,
      language: file.language, size: file.size,
      imports: matches.map((i) => i.path), importedBy: [], exports,
      group, inDegree: 0, outDegree: 0,
    });
  }

  const edges: GraphEdge[] = [];
  const edgeSet = new Set<string>();

  for (const file of files) {
    const node = nodeMap.get(file.path)!;
    const matches = extractImports(file.content, file.language);
    for (const match of matches) {
      const resolved = resolveImport(match.path, file.path, allPaths);
      if (!resolved || resolved === file.path) continue;
      const key = `${file.path}→${resolved}`;
      if (edgeSet.has(key)) continue;
      edgeSet.add(key);
      edges.push({ source: file.path, target: resolved, label: match.names?.slice(0, 40) });
      node.outDegree++;
      const target = nodeMap.get(resolved);
      if (target) { target.inDegree++; target.importedBy.push(file.path); }
    }
  }

  // Normalize duplicate references and stabilize the important nodes.
  for (const node of nodeMap.values()) {
    node.importedBy = [...new Set(node.importedBy)];
    node.imports = [...new Set(node.imports)];
  }

  return { nodes: [...nodeMap.values()], edges };
}

export function getTopFiles(graph: DependencyGraph, n = 20): GraphNode[] {
  return [...graph.nodes]
    .sort((a, b) => (b.inDegree + b.outDegree) - (a.inDegree + a.outDegree))
    .slice(0, n);
}