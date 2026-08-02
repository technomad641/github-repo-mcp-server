import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerGetWorkflowRunsTool(server: McpServer) {
  server.tool(
    "get_workflow_runs",
    "Get recent GitHub Actions workflow run status (pass/fail) for a repo.",
    {
      ...repoParams,
      branch: z.string().optional().describe("Filter to runs on this branch"),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ owner, repo, branch, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.actions.listWorkflowRunsForRepo({
          owner,
          repo,
          branch,
          per_page: limit,
        });

        return jsonResult(
          data.workflow_runs.map((run) => ({
            name: run.name,
            status: run.status,
            conclusion: run.conclusion,
            branch: run.head_branch,
            event: run.event,
            html_url: run.html_url,
            created_at: run.created_at,
          }))
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
