# github-repo-mcp-server

An MCP (Model Context Protocol) server that lets an AI assistant query GitHub
on your behalf — your own repos, issues, PRs, and CI status, plus discovery
of trending repos by topic across public GitHub.

See [SPEC.md](./SPEC.md) for the full design and development plan.

## Status

✅ All planned milestones complete.

- [x] M0 — Project scaffold: TypeScript + MCP SDK, minimal `ping` tool over stdio
- [x] M1 — GitHub client + config (Octokit auth, repo allowlist)
- [x] M2 — Tier 1 read-only personal-repo tools (12 tools)
- [x] M3 — `search_trending_repos` discovery tool
- [x] M4 — MCP resources (README, issue/PR content)
- [x] M5 — MCP prompts (reusable templates)
- [x] M6 — Tests, rate-limit hardening, docs

Tier 2 write tools (create issue, comment, etc.) were scoped out of v1
intentionally — see SPEC.md §11. This is a read-only server.

## Requirements

- Node.js 18+ (developed against Node 20; see `.nvmrc`)

## Configuration

1. Copy `.env.example` to `.env` and set `GITHUB_TOKEN` to a
   [fine-grained personal access token](https://github.com/settings/tokens?type=beta)
   with read-only `Contents`, `Issues`, `Pull requests`, and `Actions`
   permissions, scoped to the repos you want this server to access.
2. List those repos (as `"owner/repo"` strings) in `config.json` — this is
   the allowlist personal-scope tools are restricted to. `search_trending_repos`
   is exempt, since it queries public GitHub data rather than a specific repo.
3. `get_notifications` additionally needs the token's **Notifications**
   *account* permission (separate section from repository permissions on
   the token creation page) — every other tool works without it.

## Tools

**Personal scope** (allowlist-gated): `get_repo`, `list_repos`, `list_branches`,
`list_commits`, `get_file_contents`, `list_issues`, `get_issue`,
`list_pull_requests`, `get_pull_request`, `search_code`, `get_workflow_runs`,
`get_notifications`.

**Global discovery** (not allowlist-gated, searches public GitHub data):
`search_trending_repos` — finds trending repos for a topic, ranked by star
velocity among recently-created repos. A documented proxy for
github.com/trending, which has no official API.

## Resources

| URI template | Content |
|---|---|
| `repo://{owner}/{repo}/readme` | The repo's README, as markdown |
| `repo://{owner}/{repo}/issues/{number}` | Issue title, body, and comments |
| `repo://{owner}/{repo}/pulls/{number}` | PR title, description, diff stats |

## Prompts

| Name | What it does |
|---|---|
| `summarize_prs_for_review` | Finds open PRs and summarizes which need attention |
| `weekly_repo_digest` | Commits, issues, PRs, and CI status from the last week |
| `whats_trending` | Trending public repos for a GitHub topic |

## Getting started

```bash
npm install
npm run dev     # run the server directly via tsx
npm run build   # compile to dist/
npm start       # run the compiled server
```

The server communicates over stdio, following the MCP protocol — it's meant
to be launched by an MCP-compatible host (e.g. Claude Code), not run
standalone in a terminal.

## Testing

```bash
npm test        # typecheck (src + test) then run the full vitest suite
npm run typecheck
```

The suite (32 tests) runs through the real MCP protocol layer — an
`McpServer` and `Client` connected over an in-memory transport — with
`@octokit/rest` mocked, so it exercises actual schema validation and request
routing without making live API calls. Every tool, resource, and prompt was
also manually verified against a real repo during development; see individual
commit messages for what was and wasn't exercised against real data.

## Notable things found during development

A few real issues surfaced by testing against live data instead of just
mocks, worth knowing if you extend this:

- **GitHub's code search doesn't index unstarred forks.** `search_code`
  returned 0 results with `incomplete_results: true` against a fresh fork -
  confirmed via a raw `curl` call that this is GitHub's own indexing
  limitation, not a bug (forks are only code-search-indexed once they have
  more stars than their parent repo).
- **`get_notifications` needs a separate token permission.** It uses a
  GitHub *account*-level permission (Notifications), not a repository
  permission like every other tool - discovered via a live 403, now
  surfaced as a specific error message instead of the generic one.
- **Composed Octokit plugin types aren't portable.** Wrapping the client
  with `@octokit/plugin-throttling` broke `.d.ts` emission (TS2883). Fixed
  by dropping `declaration: true` from `tsconfig.json`, since this is a
  runnable server, not a library other packages import.

## License

MIT
