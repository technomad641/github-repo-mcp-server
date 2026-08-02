import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";

export function registerReadmeResource(server: McpServer) {
  server.registerResource(
    "repo-readme",
    new ResourceTemplate("repo://{owner}/{repo}/readme", { list: undefined }),
    {
      title: "Repo README",
      description: "The README file for an allowlisted repo.",
      mimeType: "text/markdown",
    },
    async (uri, { owner, repo }) => {
      const ownerStr = Array.isArray(owner) ? owner[0] : owner;
      const repoStr = Array.isArray(repo) ? repo[0] : repo;

      assertRepoAllowed(ownerStr, repoStr);
      const octokit = getGitHubClient();
      const { data } = await octokit.rest.repos.getReadme({ owner: ownerStr, repo: repoStr });
      const content = Buffer.from(data.content, "base64").toString("utf-8");

      return {
        contents: [{ uri: uri.href, mimeType: "text/markdown", text: content }],
      };
    }
  );
}
