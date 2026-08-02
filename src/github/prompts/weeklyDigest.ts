import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerWeeklyDigestPrompt(server: McpServer) {
  server.registerPrompt(
    "weekly_repo_digest",
    {
      title: "Weekly repo activity digest",
      description: "Summarizes a repo's commits, issues, PRs, and CI status from the last week.",
      argsSchema: { owner: z.string(), repo: z.string() },
    },
    ({ owner, repo }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Give me a weekly activity digest for ${owner}/${repo}. Use list_commits to see ` +
              `what's landed recently, list_issues and list_pull_requests (state: all) to see what's ` +
              `open/closed, and get_workflow_runs to check CI health. Summarize it as a short digest: ` +
              `what shipped, what's still open, and whether CI is green - focus on the last 7 days.`,
          },
        },
      ],
    })
  );
}
