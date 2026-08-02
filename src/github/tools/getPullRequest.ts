import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerGetPullRequestTool(server: McpServer) {
  server.tool(
    "get_pull_request",
    "Get detail for one PR: diff stats, mergeable state, and review status.",
    {
      ...repoParams,
      pull_number: z.number().int().positive(),
    },
    async ({ owner, repo, pull_number }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();

        const [{ data: pr }, { data: reviews }] = await Promise.all([
          octokit.rest.pulls.get({ owner, repo, pull_number }),
          octokit.rest.pulls.listReviews({ owner, repo, pull_number }),
        ]);

        return jsonResult({
          number: pr.number,
          title: pr.title,
          state: pr.state,
          draft: pr.draft,
          mergeable: pr.mergeable,
          mergeable_state: pr.mergeable_state,
          base: pr.base.ref,
          head: pr.head.ref,
          additions: pr.additions,
          deletions: pr.deletions,
          changed_files: pr.changed_files,
          html_url: pr.html_url,
          reviews: reviews.map((r) => ({ author: r.user?.login, state: r.state })),
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
