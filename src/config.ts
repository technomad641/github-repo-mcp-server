import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

interface AppConfig {
  /** "owner/repo" strings this server is allowed to read from. */
  repos: string[];
}

let cachedConfig: AppConfig | null = null;

export function loadConfig(): AppConfig {
  if (cachedConfig) return cachedConfig;

  const configPath = join(__dirname, "..", "config.json");
  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw) as AppConfig;

  if (!Array.isArray(parsed.repos) || parsed.repos.length === 0) {
    throw new Error(
      `config.json must define a non-empty "repos" allowlist (owner/repo strings)`
    );
  }

  cachedConfig = parsed;
  return parsed;
}

export function isRepoAllowed(owner: string, repo: string): boolean {
  const fullName = `${owner}/${repo}`;
  return loadConfig().repos.includes(fullName);
}

export function assertRepoAllowed(owner: string, repo: string): void {
  if (!isRepoAllowed(owner, repo)) {
    throw new Error(
      `Repo "${owner}/${repo}" is not in the config.json allowlist. ` +
        `Add it to config.json if this access is intentional.`
    );
  }
}
