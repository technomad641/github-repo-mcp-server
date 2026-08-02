import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerGetRepoTool(server: McpServer) {
  server.tool(
    "get_repo",
    "Get metadata for a repo: description, stars, language, default branch, visibility.",
    repoParams,
    async ({ owner, repo }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.repos.get({ owner, repo });
        return jsonResult({
          full_name: data.full_name,
          description: data.description,
          stars: data.stargazers_count,
          language: data.language,
          default_branch: data.default_branch,
          private: data.private,
          open_issues_count: data.open_issues_count,
          html_url: data.html_url,
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
