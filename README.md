# github-repo-mcp-server

An MCP (Model Context Protocol) server that lets an AI assistant query GitHub
on your behalf — your own repos, issues, PRs, and CI status, plus discovery
of trending repos by topic across public GitHub.

See [SPEC.md](./SPEC.md) for the full design and development plan.

## Status

🚧 Under active development, built milestone by milestone. Current: **M4 — resources**.

- [x] M0 — Project scaffold: TypeScript + MCP SDK, minimal `ping` tool over stdio
- [x] M1 — GitHub client + config (Octokit auth, repo allowlist)
- [x] M2 — Tier 1 read-only personal-repo tools (12 tools)
- [x] M3 — `search_trending_repos` discovery tool
- [x] M4 — MCP resources (README, issue/PR content)
- [ ] M5 — MCP prompts (reusable templates)
- [ ] M6 — Tests, hardening, docs

## Requirements

- Node.js 18+ (developed against Node 20; see `.nvmrc`)

## Configuration

1. Copy `.env.example` to `.env` and set `GITHUB_TOKEN` to a
   [fine-grained personal access token](https://github.com/settings/tokens?type=beta)
   with read-only `Contents`, `Issues`, `Pull requests`, and `Actions`
   permissions, scoped to the repos you want this server to access.
2. List those repos (as `"owner/repo"` strings) in `config.json` — this is
   the allowlist personal-scope tools are restricted to. The
   `search_trending_repos` tool (M3) is exempt, since it queries public
   GitHub data rather than a specific repo.
3. `get_notifications` additionally needs the token's **Notifications**
   *account* permission (separate section from repository permissions on
   the token creation page) — every other tool works without it.

## Tools (M2 — Tier 1, read-only)

`get_repo`, `list_repos`, `list_branches`, `list_commits`,
`get_file_contents`, `list_issues`, `get_issue`, `list_pull_requests`,
`get_pull_request`, `search_code`, `get_workflow_runs`, `get_notifications`.

Each was verified against a live repo during development; see individual
commit messages for what was and wasn't exercised against real data.

## Tools (M3 — global discovery)

`search_trending_repos` — not allowlist-gated, since it searches public
GitHub data rather than a specific repo.

## Resources (M4)

| URI template | Content |
|---|---|
| `repo://{owner}/{repo}/readme` | The repo's README, as markdown |
| `repo://{owner}/{repo}/issues/{number}` | Issue title, body, and comments |
| `repo://{owner}/{repo}/pulls/{number}` | PR title, description, diff stats |

All allowlist-gated the same as the Tier 1 tools.

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

## License

MIT
