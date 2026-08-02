import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerListPullRequestsTool(server: McpServer) {
  server.tool(
    "list_pull_requests",
    "List pull requests in a repo, filterable by state and branch.",
    {
      ...repoParams,
      state: z.enum(["open", "closed", "all"]).default("open"),
      base: z.string().optional().describe("Filter by base branch, e.g. main"),
      head: z.string().optional().describe("Filter by head branch, e.g. owner:branch"),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ owner, repo, state, base, head, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.pulls.list({
          owner,
          repo,
          state,
          base,
          head,
          per_page: limit,
        });

        return jsonResult(
          data.map((pr) => ({
            number: pr.number,
            title: pr.title,
            state: pr.state,
            draft: pr.draft,
            base: pr.base.ref,
            head: pr.head.ref,
            html_url: pr.html_url,
            created_at: pr.created_at,
          }))
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
