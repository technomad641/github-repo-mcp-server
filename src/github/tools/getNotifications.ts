import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { loadConfig } from "../../config.js";
import { jsonResult } from "./helpers.js";
import { describeGitHubError } from "../client.js";

export function registerGetNotificationsTool(server: McpServer) {
  server.tool(
    "get_notifications",
    "Get your unread GitHub notifications (mentions, review requests), " +
      "filtered to repos in this server's allowlist. Requires the token's " +
      "Notifications account permission - not required by other tools.",
    { all: z.boolean().default(false).describe("Include read notifications too") },
    async ({ all }) => {
      try {
        const octokit = getGitHubClient();
        const { repos } = loadConfig();
        const { data } = await octokit.rest.activity.listNotificationsForAuthenticatedUser({
          all,
        });

        const filtered = data.filter((n) => repos.includes(n.repository.full_name));

        return jsonResult(
          filtered.map((n) => ({
            repo: n.repository.full_name,
            reason: n.reason,
            subject: n.subject.title,
            type: n.subject.type,
            unread: n.unread,
            updated_at: n.updated_at,
          }))
        );
      } catch (error) {
        const status = (error as { status?: number } | undefined)?.status;
        const message =
          status === 403
            ? "GitHub denied this request - the token likely lacks the " +
              "Notifications account permission. Add it under Account " +
              "permissions on your fine-grained PAT (this is separate from " +
              "the repo permissions the other tools use)."
            : describeGitHubError(error);
        return { content: [{ type: "text" as const, text: `Error: ${message}` }], isError: true };
      }
    }
  );
}
