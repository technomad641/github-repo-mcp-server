# github-repo-mcp-server

An MCP (Model Context Protocol) server that lets an AI assistant query GitHub
on your behalf — your own repos, issues, PRs, and CI status, plus discovery
of trending repos by topic across public GitHub.

See [SPEC.md](./SPEC.md) for the full design and development plan.

## Status

🚧 Under active development, built milestone by milestone. Current: **M0 — scaffold**.

- [x] M0 — Project scaffold: TypeScript + MCP SDK, minimal `ping` tool over stdio
- [ ] M1 — GitHub client + config (Octokit auth, repo allowlist)
- [ ] M2 — Tier 1 read-only personal-repo tools
- [ ] M3 — `search_trending_repos` discovery tool
- [ ] M4 — MCP resources (README, issue/PR content)
- [ ] M5 — MCP prompts (reusable templates)
- [ ] M6 — Tests, hardening, docs

## Requirements

- Node.js 18+ (developed against Node 20; see `.nvmrc`)

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
