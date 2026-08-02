import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerSearchCodeTool(server: McpServer) {
  server.tool(
    "search_code",
    "Search code within a single allowlisted repo. Note: GitHub's code " +
      "search only indexes forks that have more stars than their parent " +
      "repo, and can lag for low-activity repos - a 0-result response may " +
      "mean 'not indexed yet' rather than 'no matches'.",
    {
      ...repoParams,
      query: z.string().describe("Search terms, e.g. \"TODO\" or \"function foo\""),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ owner, repo, query, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.search.code({
          q: `${query} repo:${owner}/${repo}`,
          per_page: limit,
        });

        return jsonResult({
          total_count: data.total_count,
          items: data.items.map((item) => ({
            path: item.path,
            html_url: item.html_url,
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
