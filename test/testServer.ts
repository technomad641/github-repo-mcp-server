import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

import { registerGetRepoTool } from "../src/github/tools/getRepo.js";
import { registerListReposTool } from "../src/github/tools/listRepos.js";
import { registerListBranchesTool } from "../src/github/tools/listBranches.js";
import { registerListCommitsTool } from "../src/github/tools/listCommits.js";
import { registerGetFileContentsTool } from "../src/github/tools/getFileContents.js";
import { registerListIssuesTool } from "../src/github/tools/listIssues.js";
import { registerGetIssueTool } from "../src/github/tools/getIssue.js";
import { registerListPullRequestsTool } from "../src/github/tools/listPullRequests.js";
import { registerGetPullRequestTool } from "../src/github/tools/getPullRequest.js";
import { registerSearchCodeTool } from "../src/github/tools/searchCode.js";
import { registerGetWorkflowRunsTool } from "../src/github/tools/getWorkflowRuns.js";
import { registerGetNotificationsTool } from "../src/github/tools/getNotifications.js";
import { registerSearchTrendingReposTool } from "../src/github/tools/searchTrendingRepos.js";
import { registerReadmeResource } from "../src/github/resources/readme.js";
import { registerIssueResource } from "../src/github/resources/issue.js";
import { registerPullRequestResource } from "../src/github/resources/pullRequest.js";
import { registerReviewSummaryPrompt } from "../src/github/prompts/reviewSummary.js";
import { registerWeeklyDigestPrompt } from "../src/github/prompts/weeklyDigest.js";
import { registerTrendingTopicPrompt } from "../src/github/prompts/trendingTopic.js";

/**
 * Builds the same server as src/index.ts and connects it to a real MCP
 * Client over an in-memory transport, so tests exercise the full protocol
 * layer (schema validation, routing, serialization) rather than calling
 * handler functions directly.
 */
export async function createTestClient(): Promise<Client> {
  const server = new McpServer({ name: "test-server", version: "0.0.0" });

  registerGetRepoTool(server);
  registerListReposTool(server);
  registerListBranchesTool(server);
  registerListCommitsTool(server);
  registerGetFileContentsTool(server);
  registerListIssuesTool(server);
  registerGetIssueTool(server);
  registerListPullRequestsTool(server);
  registerGetPullRequestTool(server);
  registerSearchCodeTool(server);
  registerGetWorkflowRunsTool(server);
  registerGetNotificationsTool(server);
  registerSearchTrendingReposTool(server);
  registerReadmeResource(server);
  registerIssueResource(server);
  registerPullRequestResource(server);
  registerReviewSummaryPrompt(server);
  registerWeeklyDigestPrompt(server);
  registerTrendingTopicPrompt(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test-client", version: "0.0.0" });

  await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

  return client;
}
