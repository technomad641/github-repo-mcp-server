import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerListIssuesTool(server: McpServer) {
  server.tool(
    "list_issues",
    "List issues in a repo, filterable by state, label, and assignee.",
    {
      ...repoParams,
      state: z.enum(["open", "closed", "all"]).default("open"),
      labels: z.string().optional().describe("Comma-separated label names to filter by"),
      assignee: z.string().optional().describe("GitHub username to filter by assignee"),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ owner, repo, state, labels, assignee, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.issues.listForRepo({
          owner,
          repo,
          state,
          labels,
          assignee,
          per_page: limit,
        });

        const issuesOnly = data.filter((issue) => !issue.pull_request);
        return jsonResult(
          issuesOnly.map((issue) => ({
            number: issue.number,
            title: issue.title,
            state: issue.state,
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
            assignees: issue.assignees?.map((a) => a.login),
            html_url: issue.html_url,
            created_at: issue.created_at,
          }))
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
