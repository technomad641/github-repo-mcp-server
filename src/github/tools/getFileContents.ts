import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getGitHubClient } from "../client.js";
import { assertRepoAllowed } from "../../config.js";
import { repoParams, jsonResult, errorResult } from "./helpers.js";

export function registerGetFileContentsTool(server: McpServer) {
  server.tool(
    "get_file_contents",
    "Read a file's contents from a repo at a given ref.",
    {
      ...repoParams,
      path: z.string().describe("File path within the repo, e.g. src/index.ts"),
      ref: z.string().optional().describe("Branch, tag, or commit sha; defaults to the default branch"),
    },
    async ({ owner, repo, path, ref }) => {
      try {
        assertRepoAllowed(owner, repo);
        const octokit = getGitHubClient();
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });

        if (Array.isArray(data)) {
          return errorResult(
            new Error(`"${path}" is a directory, not a file. Use a specific file path.`)
          );
        }
        if (data.type !== "file" || !("content" in data)) {
          return errorResult(new Error(`"${path}" is not a readable file (type: ${data.type}).`));
        }

        const content = Buffer.from(data.content, "base64").toString("utf-8");
        return jsonResult({ path: data.path, sha: data.sha, size: data.size, content });
      } catch (error) {
        return errorResult(error);
      }
    }
  );
}
