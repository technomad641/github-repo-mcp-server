import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerListCommitsTool(server: McpServer) {
  server.tool(
    "list_commits",
    "List recent commits on a branch.",
    {
      ...repoParams,
      branch: z.string().optional().describe("Branch name; defaults to the repo's default branch"),
      limit: z.number().int().min(1).max(100).default(20).describe("Max commits to return"),
    },
    async ({ owner, repo, branch, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.repos.listCommits({
          owner,
          repo,
          sha: branch,
          per_page: limit,
        });
        return jsonResult(
          data.map((c) => ({
            sha: c.sha,
            message: c.commit.message,
            author: c.commit.author?.name,
            date: c.commit.author?.date,
            html_url: c.html_url,
          }))
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
