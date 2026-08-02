import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerGetIssueTool(server: McpServer) {
  server.tool(
    "get_issue",
    "Get full detail for one issue, including its comment thread.",
    {
      ...repoParams,
      issue_number: z.number().int().positive(),
    },
    async ({ owner, repo, issue_number }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();

        const [{ data: issue }, { data: comments }] = await Promise.all([
          octokit.rest.issues.get({ owner, repo, issue_number }),
          octokit.rest.issues.listComments({ owner, repo, issue_number }),
        ]);

        return jsonResult({
          number: issue.number,
          title: issue.title,
          state: issue.state,
          body: issue.body,
          labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
          html_url: issue.html_url,
          comments: comments.map((c) => ({
            author: c.user?.login,
            body: c.body,
            created_at: c.created_at,
          })),
        });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
