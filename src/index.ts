import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { registerGetRepoTool } from "./github/tools/getRepo.js";
import { registerListReposTool } from "./github/tools/listRepos.js";
import { registerListBranchesTool } from "./github/tools/listBranches.js";

const server = new McpServer({
  name: "github-repo-mcp-server",
  version: "0.1.0",
});

registerGetRepoTool(server);
registerListReposTool(server);
registerListBranchesTool(server);

// M0 placeholder tool: proves the server boots and responds over stdio.
// Replaced by real GitHub-backed tools starting in M1.
server.tool(
  "ping",
  "Health check — returns pong plus the current server time.",
  { message: z.string().optional().describe("Optional echo message") },
  async ({ message }) => ({
    content: [
      {
        type: "text",
        text: `pong${message ? `: ${message}` : ""} (${new Date().toISOString()})`,
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error starting github-repo-mcp-server:", error);
  process.exit(1);
});
