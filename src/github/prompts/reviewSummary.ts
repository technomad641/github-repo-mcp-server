import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerReviewSummaryPrompt(server: McpServer) {
  server.registerPrompt(
    "summarize_prs_for_review",
    {
      title: "Summarize PRs waiting on my review",
      description: "Lists open PRs on a repo and summarizes what each one changes.",
      argsSchema: { owner: z.string(), repo: z.string() },
    },
    ({ owner, repo }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Use the list_pull_requests tool for ${owner}/${repo} (state: open) to find open PRs. ` +
              `For each one, use get_pull_request to check its diff stats and review status. ` +
              `Then give me a short summary of each PR - what it changes, how big it is, and whether it already has reviews - so I know which ones actually need my attention.`,
          },
        },
      ],
    })
  );
}
