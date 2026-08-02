import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubClient } from "../client.js";
import { loadConfig } from "../../config.js";
import { jsonResult, errorResult } from "./helpers.js";

export function registerListReposTool(server: McpServer) {
  server.tool(
    "list_repos",
    "List every repo in this server's allowlist, with basic metadata for each.",
    {},
    async () => {
      try {
        const octokit = getGitHubClient();
        const { repos } = loadConfig();

        const results = await Promise.all(
          repos.map(async (fullName) => {
            const [owner, repo] = fullName.split("/");
            const { data } = await octokit.rest.repos.get({ owner, repo });
            return {
              full_name: data.full_name,
              description: data.description,
              stars: data.stargazers_count,
              language: data.language,
              default_branch: data.default_branch,
            };
          })
        );

        return jsonResult(results);
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
