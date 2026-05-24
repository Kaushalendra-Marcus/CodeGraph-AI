export interface RepoFile {
  path: string;
  content: string;
  size: number;
  language: string;
}

export interface RepoInfo {
  owner: string;
  repo: string;
  description: string;
  stars: number;
  language: string;
  files: RepoFile[];
  tree: TreeNode[];
}

export interface TreeNode {
  path: string;
  type: "file" | "dir";
  children?: TreeNode[];
}

const SKIP_DIRS = new Set([
  "node_modules", ".git", "dist", "build", ".next", "__pycache__",
  ".venv", "venv", "env", ".tox", "coverage", ".cache", "vendor",
  "target", "bin", "obj", ".idea", ".vscode",
]);

const CODE_EXTS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java",
  ".cs", ".cpp", ".c", ".h", ".rb", ".php", ".swift", ".kt",
  ".vue", ".svelte", ".mjs", ".cjs", ".json", ".yaml", ".yml",
  ".toml", ".env.example", ".md",
]);

const LANG_MAP: Record<string, string> = {
  ".ts": "TypeScript", ".tsx": "TypeScript",
  ".js": "JavaScript", ".jsx": "JavaScript",
  ".py": "Python", ".go": "Go",
  ".rs": "Rust", ".java": "Java",
  ".rb": "Ruby", ".php": "PHP",
  ".cs": "C#", ".cpp": "C++",
  ".vue": "Vue", ".svelte": "Svelte",
  ".md": "Markdown", ".json": "JSON",
  ".yaml": "YAML", ".yml": "YAML",
  ".toml": "TOML",
};

export function parseGithubUrl(url: string): { owner: string; repo: string } {
  const cleaned = url.replace(/\/$/, "").replace(/\.git$/, "");
  const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
  if (!match) throw new Error("Invalid GitHub URL. Example: https://github.com/owner/repo");
  return { owner: match[1], repo: match[2] };
}

export async function fetchRepo(
  url: string,
  githubToken?: string,
  onProgress?: (msg: string) => void
): Promise<RepoInfo> {
  const { owner, repo } = parseGithubUrl(url);
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  const log = (msg: string) => onProgress?.(msg);

  log(`Fetching repository info for ${owner}/${repo}...`);

  // Get repo metadata
  const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!metaRes.ok) {
    const err = await metaRes.json() as any;
    throw new Error(`GitHub API: ${err.message || metaRes.statusText}`);
  }
  const meta = await metaRes.json() as any;

  log(`Fetching file tree...`);

  // Get full recursive tree
  const treeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
    { headers }
  );
  if (!treeRes.ok) throw new Error("Could not fetch repository tree");
  const treeData = await treeRes.json() as any;

  const allFiles = (treeData.tree as any[]).filter(
    (item) =>
      item.type === "blob" &&
      item.size < 100000 && // skip files > 100KB
      shouldInclude(item.path)
  );

  log(`Found ${allFiles.length} relevant files. Fetching contents...`);

  // Fetch file contents in batches
  const files: RepoFile[] = [];
  const batchSize = 8;

  for (let i = 0; i < Math.min(allFiles.length, 60); i += batchSize) {
    const batch = allFiles.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map((f) => fetchFileContent(owner, repo, f.path, headers))
    );

    for (let j = 0; j < batch.length; j++) {
      const r = results[j];
      if (r.status === "fulfilled" && r.value) {
        const ext = getExt(batch[j].path);
        files.push({
          path: batch[j].path,
          content: r.value,
          size: batch[j].size,
          language: LANG_MAP[ext] || "Unknown",
        });
      }
    }
    log(`Fetched ${Math.min(i + batchSize, allFiles.length)}/${Math.min(allFiles.length, 60)} files...`);
  }

  const tree = buildTree(allFiles.map((f) => f.path));

  return {
    owner,
    repo,
    description: meta.description || "",
    stars: meta.stargazers_count || 0,
    language: meta.language || "",
    files,
    tree,
  };
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string,
  headers: Record<string, string>
): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      { headers }
    );
    if (!res.ok) return null;
    const data = await res.json() as any;
    if (data.encoding === "base64") {
      return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
    }
    return null;
  } catch {
    return null;
  }
}

function shouldInclude(path: string): boolean {
  const parts = path.split("/");
  for (const part of parts.slice(0, -1)) {
    if (SKIP_DIRS.has(part)) return false;
  }
  const ext = getExt(path);
  return CODE_EXTS.has(ext);
}

function getExt(path: string): string {
  const dot = path.lastIndexOf(".");
  return dot >= 0 ? path.slice(dot) : "";
}

function buildTree(paths: string[]): TreeNode[] {
  const root: TreeNode[] = [];
  const map = new Map<string, TreeNode>();

  for (const p of paths) {
    const parts = p.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const key = parts.slice(0, i + 1).join("/");
      if (!map.has(key)) {
        const node: TreeNode = {
          path: key,
          type: i === parts.length - 1 ? "file" : "dir",
          children: i === parts.length - 1 ? undefined : [],
        };
        map.set(key, node);
        current.push(node);
      }
      const node = map.get(key)!;
      if (node.children) current = node.children;
    }
  }
  return root;
}