import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import type { Client } from "@modelcontextprotocol/sdk/client/index.js";

const mockOctokit = vi.hoisted(() => ({
  rest: {
    repos: {
      get: vi.fn(),
      listBranches: vi.fn(),
      listCommits: vi.fn(),
      getContent: vi.fn(),
      getReadme: vi.fn(),
    },
    issues: { listForRepo: vi.fn(), get: vi.fn(), listComments: vi.fn() },
    pulls: { list: vi.fn(), get: vi.fn(), listReviews: vi.fn() },
    search: { code: vi.fn(), repos: vi.fn() },
    actions: { listWorkflowRunsForRepo: vi.fn() },
    activity: { listNotificationsForAuthenticatedUser: vi.fn() },
  },
}));

vi.mock("@octokit/rest", () => ({
  Octokit: vi.fn().mockImplementation(function MockOctokit() {
    return mockOctokit;
  }),
}));

import { createTestClient } from "./testServer.js";

const OWNER = "technomad641";
const REPO = "AI-For-Beginners";

function textOf(result: Awaited<ReturnType<Client["callTool"]>>): string {
  const content = result.content as Array<{ type: string; text: string }>;
  return content[0].text;
}

function resourceTextOf(result: Awaited<ReturnType<Client["readResource"]>>): string {
  const content = result.contents[0] as { text?: string };
  if (content.text === undefined) throw new Error("expected a text resource content");
  return content.text;
}

function promptTextOf(result: Awaited<ReturnType<Client["getPrompt"]>>): string {
  const content = result.messages[0].content as { text?: string };
  if (content.text === undefined) throw new Error("expected text prompt content");
  return content.text;
}

describe("MCP server (mocked Octokit)", () => {
  let client: Client;

  beforeAll(async () => {
    process.env.GITHUB_TOKEN = "test-token";
    client = await createTestClient();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("get_repo returns mapped repo metadata", async () => {
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: {
        full_name: `${OWNER}/${REPO}`,
        description: "desc",
        stargazers_count: 5,
        language: "Python",
        default_branch: "main",
        private: false,
        open_issues_count: 0,
        html_url: "https://github.com/x",
      },
    });

    const result = await client.callTool({
      name: "get_repo",
      arguments: { owner: OWNER, repo: REPO },
    });

    expect(JSON.parse(textOf(result))).toMatchObject({ full_name: `${OWNER}/${REPO}`, stars: 5 });
  });

  it("get_repo rejects a repo outside the allowlist", async () => {
    const result = await client.callTool({
      name: "get_repo",
      arguments: { owner: "someone-else", repo: "not-allowed" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/not in the config\.json allowlist/);
    expect(mockOctokit.rest.repos.get).not.toHaveBeenCalled();
  });

  it("list_repos returns metadata for every allowlisted repo", async () => {
    mockOctokit.rest.repos.get.mockResolvedValue({
      data: {
        full_name: `${OWNER}/${REPO}`,
        description: "desc",
        stargazers_count: 5,
        language: "Python",
        default_branch: "main",
      },
    });

    const result = await client.callTool({ name: "list_repos", arguments: {} });
    expect(JSON.parse(textOf(result))).toHaveLength(1);
  });

  it("list_branches maps branch fields", async () => {
    mockOctokit.rest.repos.listBranches.mockResolvedValue({
      data: [{ name: "main", protected: true, commit: { sha: "abc123" } }],
    });

    const result = await client.callTool({
      name: "list_branches",
      arguments: { owner: OWNER, repo: REPO },
    });

    expect(JSON.parse(textOf(result))).toEqual([{ name: "main", protected: true, sha: "abc123" }]);
  });

  it("list_commits maps commit fields", async () => {
    mockOctokit.rest.repos.listCommits.mockResolvedValue({
      data: [
        {
          sha: "abc123",
          commit: { message: "fix bug", author: { name: "Rajat", date: "2026-01-01T00:00:00Z" } },
          html_url: "https://github.com/x/commit/abc123",
        },
      ],
    });

    const result = await client.callTool({
      name: "list_commits",
      arguments: { owner: OWNER, repo: REPO },
    });

    expect(JSON.parse(textOf(result))[0]).toMatchObject({ sha: "abc123", author: "Rajat" });
  });

  it("get_file_contents decodes base64 file content", async () => {
    mockOctokit.rest.repos.getContent.mockResolvedValue({
      data: {
        type: "file",
        path: "README.md",
        sha: "def456",
        size: 11,
        content: Buffer.from("hello world").toString("base64"),
      },
    });

    const result = await client.callTool({
      name: "get_file_contents",
      arguments: { owner: OWNER, repo: REPO, path: "README.md" },
    });

    expect(JSON.parse(textOf(result)).content).toBe("hello world");
  });

  it("get_file_contents errors cleanly on a directory path", async () => {
    mockOctokit.rest.repos.getContent.mockResolvedValue({ data: [{ type: "dir" }] });

    const result = await client.callTool({
      name: "get_file_contents",
      arguments: { owner: OWNER, repo: REPO, path: "src" },
    });

    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/directory, not a file/);
  });

  it("list_issues filters out pull requests", async () => {
    mockOctokit.rest.issues.listForRepo.mockResolvedValue({
      data: [
        { number: 1, title: "real issue", state: "open", labels: [], html_url: "u", created_at: "d" },
        {
          number: 2,
          title: "a PR",
          state: "open",
          labels: [],
          html_url: "u",
          created_at: "d",
          pull_request: {},
        },
      ],
    });

    const result = await client.callTool({
      name: "list_issues",
      arguments: { owner: OWNER, repo: REPO },
    });

    const issues = JSON.parse(textOf(result));
    expect(issues).toHaveLength(1);
    expect(issues[0].number).toBe(1);
  });

  it("get_issue merges the issue with its comment thread", async () => {
    mockOctokit.rest.issues.get.mockResolvedValue({
      data: { number: 1, title: "bug", state: "open", body: "it's broken", labels: [], html_url: "u" },
    });
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [{ user: { login: "rajat641" }, body: "looking into it", created_at: "d" }],
    });

    const result = await client.callTool({
      name: "get_issue",
      arguments: { owner: OWNER, repo: REPO, issue_number: 1 },
    });

    const issue = JSON.parse(textOf(result));
    expect(issue.title).toBe("bug");
    expect(issue.comments[0].author).toBe("rajat641");
  });

  it("list_pull_requests maps PR fields", async () => {
    mockOctokit.rest.pulls.list.mockResolvedValue({
      data: [
        {
          number: 3,
          title: "add feature",
          state: "open",
          draft: false,
          base: { ref: "main" },
          head: { ref: "feature" },
          html_url: "u",
          created_at: "d",
        },
      ],
    });

    const result = await client.callTool({
      name: "list_pull_requests",
      arguments: { owner: OWNER, repo: REPO },
    });

    expect(JSON.parse(textOf(result))[0]).toMatchObject({ number: 3, base: "main", head: "feature" });
  });

  it("get_pull_request merges PR detail with reviews", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 3,
        title: "add feature",
        state: "open",
        draft: false,
        mergeable: true,
        mergeable_state: "clean",
        base: { ref: "main" },
        head: { ref: "feature" },
        additions: 10,
        deletions: 2,
        changed_files: 1,
        html_url: "u",
      },
    });
    mockOctokit.rest.pulls.listReviews.mockResolvedValue({
      data: [{ user: { login: "rajat641" }, state: "APPROVED" }],
    });

    const result = await client.callTool({
      name: "get_pull_request",
      arguments: { owner: OWNER, repo: REPO, pull_number: 3 },
    });

    const pr = JSON.parse(textOf(result));
    expect(pr.mergeable_state).toBe("clean");
    expect(pr.reviews[0].state).toBe("APPROVED");
  });

  it("search_code scopes the query to the target repo", async () => {
    mockOctokit.rest.search.code.mockResolvedValue({
      data: { total_count: 1, items: [{ path: "src/index.ts", html_url: "u" }] },
    });

    await client.callTool({
      name: "search_code",
      arguments: { owner: OWNER, repo: REPO, query: "TODO" },
    });

    expect(mockOctokit.rest.search.code).toHaveBeenCalledWith(
      expect.objectContaining({ q: `TODO repo:${OWNER}/${REPO}` })
    );
  });

  it("get_workflow_runs maps run status fields", async () => {
    mockOctokit.rest.actions.listWorkflowRunsForRepo.mockResolvedValue({
      data: {
        workflow_runs: [
          {
            name: "CI",
            status: "completed",
            conclusion: "success",
            head_branch: "main",
            event: "push",
            html_url: "u",
            created_at: "d",
          },
        ],
      },
    });

    const result = await client.callTool({
      name: "get_workflow_runs",
      arguments: { owner: OWNER, repo: REPO },
    });

    expect(JSON.parse(textOf(result))[0]).toMatchObject({ conclusion: "success" });
  });

  it("get_notifications filters results down to the allowlist", async () => {
    mockOctokit.rest.activity.listNotificationsForAuthenticatedUser.mockResolvedValue({
      data: [
        {
          repository: { full_name: `${OWNER}/${REPO}` },
          reason: "mention",
          subject: { title: "you were mentioned", type: "Issue" },
          unread: true,
          updated_at: "d",
        },
        {
          repository: { full_name: "someone-else/other-repo" },
          reason: "mention",
          subject: { title: "unrelated", type: "Issue" },
          unread: true,
          updated_at: "d",
        },
      ],
    });

    const result = await client.callTool({ name: "get_notifications", arguments: {} });
    const notifications = JSON.parse(textOf(result));
    expect(notifications).toHaveLength(1);
    expect(notifications[0].repo).toBe(`${OWNER}/${REPO}`);
  });

  it("get_notifications gives a specific message on 403", async () => {
    mockOctokit.rest.activity.listNotificationsForAuthenticatedUser.mockRejectedValue({ status: 403 });

    const result = await client.callTool({ name: "get_notifications", arguments: {} });
    expect(result.isError).toBe(true);
    expect(textOf(result)).toMatch(/Notifications account permission/);
  });

  it("search_trending_repos is not gated by the allowlist and builds the right query", async () => {
    mockOctokit.rest.search.repos.mockResolvedValue({
      data: {
        total_count: 100,
        items: [
          {
            full_name: "someone/trending-repo",
            description: "cool",
            stargazers_count: 500,
            language: "Python",
            created_at: "2026-01-01T00:00:00Z",
            html_url: "u",
          },
        ],
      },
    });

    const result = await client.callTool({
      name: "search_trending_repos",
      arguments: { topic: "machine-learning", since_days: 7 },
    });

    expect(mockOctokit.rest.search.repos).toHaveBeenCalledWith(
      expect.objectContaining({
        q: expect.stringMatching(/^topic:machine-learning created:>\d{4}-\d{2}-\d{2}$/),
        sort: "stars",
        order: "desc",
      })
    );
    expect(JSON.parse(textOf(result)).items[0].full_name).toBe("someone/trending-repo");
  });

  it("readme resource returns decoded README content", async () => {
    mockOctokit.rest.repos.getReadme.mockResolvedValue({
      data: { content: Buffer.from("# Hello").toString("base64") },
    });

    const result = await client.readResource({ uri: `repo://${OWNER}/${REPO}/readme` });
    expect(resourceTextOf(result)).toBe("# Hello");
  });

  it("issue resource renders title, body, and comments as markdown", async () => {
    mockOctokit.rest.issues.get.mockResolvedValue({
      data: { number: 1, title: "bug", body: "it's broken" },
    });
    mockOctokit.rest.issues.listComments.mockResolvedValue({
      data: [{ user: { login: "rajat641" }, body: "on it" }],
    });

    const result = await client.readResource({ uri: `repo://${OWNER}/${REPO}/issues/1` });
    const text = resourceTextOf(result);
    expect(text).toContain("bug (#1)");
    expect(text).toContain("rajat641");
  });

  it("pull request resource renders diff stats", async () => {
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        number: 3,
        title: "add feature",
        base: { ref: "main" },
        head: { ref: "feature" },
        state: "open",
        draft: false,
        additions: 10,
        deletions: 2,
        changed_files: 1,
        body: "does the thing",
      },
    });

    const result = await client.readResource({ uri: `repo://${OWNER}/${REPO}/pulls/3` });
    expect(resourceTextOf(result)).toContain("+10 -2 across 1 files");
  });

  it("summarize_prs_for_review prompt substitutes owner/repo", async () => {
    const result = await client.getPrompt({
      name: "summarize_prs_for_review",
      arguments: { owner: OWNER, repo: REPO },
    });
    expect(promptTextOf(result)).toContain(`${OWNER}/${REPO}`);
  });

  it("weekly_repo_digest prompt substitutes owner/repo", async () => {
    const result = await client.getPrompt({
      name: "weekly_repo_digest",
      arguments: { owner: OWNER, repo: REPO },
    });
    expect(promptTextOf(result)).toContain(`${OWNER}/${REPO}`);
  });

  it("whats_trending prompt substitutes topic", async () => {
    const result = await client.getPrompt({
      name: "whats_trending",
      arguments: { topic: "machine-learning" },
    });
    expect(promptTextOf(result)).toContain("machine-learning");
  });
});
