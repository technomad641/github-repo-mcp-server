# GitHub Repo Assistant — MCP Server Spec & Development Plan

## 1. Overview
An MCP server that lets an AI assistant query GitHub on your behalf: your own
repos/issues/PRs/CI status, and separately, public trending repos across all
of GitHub (e.g. "what's trending in machine learning right now").

Two capability groups with two different trust boundaries:

- **Personal scope** — tools that touch repos you've explicitly allowlisted,
  using a fine-grained GitHub token scoped only to those repos.
- **Global discovery scope** — tools that search public GitHub data at large
  (not limited to your repos), using the official Search API.

## 2. Goals / Non-goals

**Goals**
- Read-only in v1. Zero risk of unintended writes to any repo.
- Use only official, documented GitHub REST/Search APIs — no scraping, no
  unofficial endpoints.
- Work entirely self-serve — no GitHub App review or partner approval needed.

**Non-goals (v1)**
- No write actions (create issue, comment, etc.) — deferred to v2, opt-in.
- No true "trending" replication of github.com/trending (unofficial, no API)
  — approximated instead via Search API sorted by recent star velocity.
- No geographic/country filtering — GitHub has no such field for repos.

## 3. Architecture

```
AI Host (Claude Code)
   │  stdio (MCP protocol)
   ▼
MCP Server (Node.js / TypeScript)
   ├─ Personal-scope tools ──► Octokit (auth: fine-grained PAT, repo allowlist)
   ├─ Discovery-scope tools ─► Octokit (auth: PAT, public Search API)
   ├─ Resources (README, issue/PR content)
   └─ Prompts (digest templates)
```

- **Transport:** stdio (standard for locally-run MCP servers).
- **GitHub client:** `@octokit/rest`, handles pagination + rate-limit headers.
- **Validation:** `zod` schemas for every tool's input.

## 4. Auth & Config

- `GITHUB_TOKEN` env var — a fine-grained Personal Access Token.
  - Personal-scope tools require **read** permission on the specific repos
    listed in `config.json`.
  - Discovery-scope tools (`search_trending_repos`) only need the token for
    higher rate limits — Search API works over public data regardless of
    per-repo permissions.
- `config.json` — repo allowlist for personal-scope tools:
  ```json
  { "repos": ["technomad641/ScreenCueTime"] }
  ```
- Token is never logged; requests strip auth headers before any debug output.

## 5. Capabilities

### 5.1 Tier 1 — Personal repo tools (read-only, v1)
| Tool | Description |
|---|---|
| `list_repos` | List repos from the allowlist (or org, if configured) |
| `get_repo` | Metadata — stars, description, default branch, language |
| `list_issues` | Filter by state, label, assignee |
| `get_issue` | Full issue + comment thread |
| `list_pull_requests` | Filter by state, base/head branch |
| `get_pull_request` | Diff stats, review status, mergeable state, checks |
| `list_commits` | Recent commits on a branch |
| `get_file_contents` | Read a file at a given ref |
| `search_code` | Search code within an allowlisted repo |
| `get_workflow_runs` | GitHub Actions run status (pass/fail) |
| `list_branches` | List branches |
| `get_notifications` | Unread mentions / review requests for the user |

### 5.2 Tier 2 — Write tools (v2, deferred, opt-in)
`create_issue`, `comment_on_issue_or_pr`, `add_labels`, `close_issue`.
Not built in v1 — flagged here so the architecture (separate write-scoped
token) is planned for, not bolted on later.

### 5.3 Global discovery — trending repos (new, v1)
| Tool | Description |
|---|---|
| `search_trending_repos` | `GET /search/repositories?q=topic:{topic}+created:>{date}&sort=stars&order=desc` — repos in a given topic (e.g. `machine-learning`) created/pushed recently, ranked by star velocity. Proxy for "trending" since GitHub's real Trending page has no API. No geography filter (not supported by GitHub's data model). |

Params: `topic` (required), `since_days` (default 7), `limit` (default 10).

### 5.4 Resources
- Repo README exposed as a browsable resource (`repo://{owner}/{repo}/readme`)
- Issue/PR content addressable as resource URIs, so the AI can reference
  them without a separate tool call

### 5.5 Prompts (reusable templates)
- "Summarize PRs waiting on my review"
- "Weekly repo activity digest"
- "What's trending in {topic} this week"

## 6. Tech stack
- Node.js + TypeScript
- `@modelcontextprotocol/sdk` — MCP server framework
- `@octokit/rest` — GitHub API client (built-in pagination + rate-limit handling)
- `zod` — input validation for tool schemas
- `vitest` — unit tests

## 7. Project structure
```
MCP-Server/
├── SPEC.md
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # MCP server entrypoint, tool registration
│   ├── github/
│   │   ├── client.ts         # Octokit instance, auth loading
│   │   ├── personalTools.ts  # Tier 1 tool handlers
│   │   └── discoveryTools.ts # search_trending_repos handler
│   ├── resources.ts          # README / issue / PR resources
│   ├── prompts.ts            # prompt templates
│   └── config.ts             # loads config.json + env
├── config.json                # repo allowlist (gitignored if it contains private repo names)
└── test/
    ├── personalTools.test.ts
    └── discoveryTools.test.ts
```

## 8. Non-functional requirements
- **Rate limiting:** respect `X-RateLimit-Remaining`/`Reset` headers; back off
  and surface a clear error rather than silently retrying forever.
- **Pagination:** use Octokit's built-in paginate helpers; cap results to
  avoid huge payloads back to the AI (default page size 20-30).
- **Error handling:** distinguish auth errors (bad/expired token) from
  not-found (repo not in allowlist) from rate-limit errors, with actionable
  messages.
- **Security:** token from env only, never written to disk or logs;
  `config.json` reviewed before commit if it lists private repos.

## 9. Testing strategy
- Unit tests per tool handler with mocked Octokit responses (no live API
  calls in CI).
- One optional smoke test hitting the real API against a public repo
  (e.g. this repo itself), run manually, not in CI, to avoid rate-limit
  flakiness.

## 10. Development plan / milestones

| Milestone | Scope |
|---|---|
| **M0 — Scaffold** | `package.json`, `tsconfig.json`, minimal MCP server that registers one dummy tool and runs over stdio |
| **M1 — GitHub client + config** | `client.ts` (Octokit + auth), `config.ts` (allowlist loader), error handling scaffolding |
| **M2 — Tier 1 tools** | Implement all 12 personal-scope read-only tools |
| **M3 — Discovery tool** | Implement `search_trending_repos` |
| **M4 — Resources** | README + issue/PR resources |
| **M5 — Prompts** | The three prompt templates |
| **M6 — Tests + polish** | Unit tests, rate-limit/pagination hardening, README for the project itself |
| **M7 — v2 (later)** | Tier 2 write tools, separate write-scoped token |

## 11. Open questions
- Confirm repo allowlist for `config.json` before M1.
- Tier 2 write tools intentionally deferred — revisit after v1 is in daily use.
