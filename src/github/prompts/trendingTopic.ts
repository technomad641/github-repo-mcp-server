import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerTrendingTopicPrompt(server: McpServer) {
  server.registerPrompt(
    "whats_trending",
    {
      title: "What's trending in {topic} this week",
      description: "Summarizes trending public repos for a GitHub topic.",
      argsSchema: { topic: z.string() },
    },
    ({ topic }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text:
              `Use the search_trending_repos tool with topic="${topic}" and since_days=7 to find ` +
              `what's trending. Summarize the top results: what each project does, its star count, ` +
              `and primary language - so I get a quick pulse on what's new in ${topic} this week.`,
          },
        },
      ],
    })
  );
}
