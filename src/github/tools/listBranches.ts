import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerListBranchesTool(server: McpServer) {
  server.tool(
    "list_branches",
    "List branches in a repo.",
    {
      ...repoParams,
      limit: z.number().int().min(1).max(100).default(30).describe("Max branches to return"),
    },
    async ({ owner, repo, limit }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: limit,
        });
        return jsonResult(
          data.map((b) => ({ name: b.name, protected: b.protected, sha: b.commit.sha }))
        );
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
