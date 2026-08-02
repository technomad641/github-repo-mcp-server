import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubClient, describeGitHubError } from "../client.js";
import { assertRepoAllowed } from "../../config.js";

export function registerPullRequestResource(server: McpServer) {
  server.registerResource(
    "repo-pull-request",
    new ResourceTemplate("repo://{owner}/{repo}/pulls/{number}", { list: undefined }),
    {
      title: "Repo Pull Request",
      description: "A single PR's title, description, and diff stats for an allowlisted repo.",
      mimeType: "text/markdown",
    },
    async (uri, { owner, repo, number }) => {
      const ownerStr = Array.isArray(owner) ? owner[0] : owner;
      const repoStr = Array.isArray(repo) ? repo[0] : repo;
      const numberStr = Array.isArray(number) ? number[0] : number;

      assertRepoAllowed(ownerStr, repoStr);
      const octokit = getGitHubClient();
      const pull_number = Number(numberStr);

      try {
        const { data: pr } = await octokit.rest.pulls.get({
          owner: ownerStr,
          repo: repoStr,
          pull_number,
        });

        const text = [
          `# ${pr.title} (#${pr.number})`,
          `**${pr.base.ref} ← ${pr.head.ref}** | ${pr.state}${pr.draft ? " (draft)" : ""}`,
          `+${pr.additions} -${pr.deletions} across ${pr.changed_files} files`,
          "",
          pr.body ?? "",
        ].join("\n");

        return { contents: [{ uri: uri.href, mimeType: "text/markdown", text }] };
      } catch (error) {
        throw new Error(describeGitHubError(error));
      }
    }
  );
}
