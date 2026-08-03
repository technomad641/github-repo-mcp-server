import { Octokit } from "@octokit/rest";
import { throttling } from "@octokit/plugin-throttling";

const ThrottledOctokit = Octokit.plugin(throttling);
type ThrottledOctokitInstance = InstanceType<typeof ThrottledOctokit>;

let cachedClient: ThrottledOctokitInstance | null = null;

// Max automatic retries before giving up and surfacing a clear rate-limit
// error, instead of retrying forever (see SPEC.md non-functional requirements).
const MAX_RATE_LIMIT_RETRIES = 1;

export function getGitHubClient(): ThrottledOctokitInstance {
  if (cachedClient) return cachedClient;

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "GITHUB_TOKEN is not set. Add it to .env (see .env.example) before " +
        "running any GitHub-backed tool."
    );
  }

  cachedClient = new ThrottledOctokit({
    auth: token,
    throttle: {
      onRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Rate limit hit for ${options.method} ${options.url}`);
        return retryCount < MAX_RATE_LIMIT_RETRIES;
      },
      onSecondaryRateLimit: (retryAfter, options, octokit, retryCount) => {
        octokit.log.warn(`Secondary rate limit hit for ${options.method} ${options.url}`);
        return retryCount < MAX_RATE_LIMIT_RETRIES;
      },
    },
  });
  return cachedClient;
}

/**
 * Maps a raw Octokit/GitHub API error into a message that's actually
 * actionable for whoever (human or AI) is reading the tool result, instead
 * of a raw HTTP status.
 */
export function describeGitHubError(error: unknown): string {
  const status = (error as { status?: number } | undefined)?.status;

  switch (status) {
    case 401:
      return "GitHub rejected the token — it may be invalid or expired. Regenerate it at github.com/settings/tokens?type=beta.";
    case 403:
      return "GitHub denied this request — either the token lacks the required permission for this repo, or you've hit a rate limit.";
    case 404:
      return "Not found — the repo/issue/PR doesn't exist, or the token isn't scoped to see it.";
    default:
      return error instanceof Error ? error.message : String(error);
  }
}
