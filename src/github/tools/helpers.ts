import { z } from "zod";
import { describeGitHubError } from "../client.js";

/** owner/repo params shared by every repo-scoped tool. */
export const repoParams = {
  owner: z.string().describe("Repository owner (user or org)"),
  repo: z.string().describe("Repository name"),
};

export function jsonResult(data: unknown) {
  return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
}

export function errorResult(error: unknown) {
  return {
    content: [{ type: "text" as const, text: `Error: ${describeGitHubError(error)}` }],
    isError: true,
  };
}
