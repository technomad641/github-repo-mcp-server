import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getGitHubClient, describeGitHubError } from "../client.js";
import { assertRepoAllowed } from "../../config.js";

export function registerIssueResource(server: McpServer) {
  server.registerResource(
    "repo-issue",
    new ResourceTemplate("repo://{owner}/{repo}/issues/{number}", { list: undefined }),
    {
      title: "Repo Issue",
      description: "A single issue's title, body, and comments for an allowlisted repo.",
      mimeType: "text/markdown",
    },
    async (uri, { owner, repo, number }) => {
      const ownerStr = Array.isArray(owner) ? owner[0] : owner;
      const repoStr = Array.isArray(repo) ? repo[0] : repo;
      const numberStr = Array.isArray(number) ? number[0] : number;

      assertRepoAllowed(ownerStr, repoStr);
      const octokit = getGitHubClient();
      const issue_number = Number(numberStr);

      try {
        const [{ data: issue }, { data: comments }] = await Promise.all([
          octokit.rest.issues.get({ owner: ownerStr, repo: repoStr, issue_number }),
          octokit.rest.issues.listComments({ owner: ownerStr, repo: repoStr, issue_number }),
        ]);

        const commentsMd = comments
          .map((c) => `\n\n---\n**${c.user?.login}** commented:\n\n${c.body}`)
          .join("");

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# ${issue.title} (#${issue.number})\n\n${issue.body ?? ""}${commentsMd}`,
            },
          ],
        };
      } catch (error) {
        throw new Error(describeGitHubError(error));
      }
    }
  );
}
