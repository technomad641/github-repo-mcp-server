import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { jsonResult, errorResult } from "./helpers.js";

function daysAgoISODate(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

export function registerSearchTrendingReposTool(server: McpServer) {
  server.tool(
    "search_trending_repos",
    "Find trending repos for a topic across all of public GitHub, ranked " +
      "by star count among repos created/pushed recently. This is a proxy " +
      "for github.com/trending, which has no official API - it is not an " +
      "exact match for that page's algorithm. Not restricted to the repo " +
      "allowlist, since it searches public GitHub data at large.",
    {
      topic: z.string().describe('GitHub topic slug, e.g. "machine-learning"'),
      since_days: z.number().int().min(1).max(365).default(7).describe("How many days back to look"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ topic, since_days, limit }) => {
      try {
        const octokit = getGitHubClient();
        const since = daysAgoISODate(since_days);
        const { data } = await octokit.rest.search.repos({
          q: `topic:${topic} created:>${since}`,
          sort: "stars",
          order: "desc",
          per_page: limit,
        });

        return jsonResult({
          total_count: data.total_count,
          items: data.items.map((repo) => ({
            full_name: repo.full_name,
            description: repo.description,
            stars: repo.stargazers_count,
            language: repo.language,
            created_at: repo.created_at,
            html_url: repo.html_url,
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
