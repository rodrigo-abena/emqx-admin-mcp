import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerSubscriptionTools(server: McpServer) {
  server.tool(
    "list_subscriptions",
    "List all active topic subscriptions. Filter by clientid, topic pattern, or QoS level.",
    {
      environment: envSchema,
      clientid: z.string().optional().describe("Filter by client ID"),
      topic: z.string().optional().describe("Filter by exact topic"),
      match_topic: z.string().optional().describe("Filter by topic pattern (supports wildcards)"),
      qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).optional().describe("Filter by QoS level"),
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(1000).default(50),
    },
    async ({ environment, clientid, topic, match_topic, qos, page, limit }) => {
      const data = await emqx.get(environment as Environment, "/subscriptions", {
        clientid,
        topic,
        _match_topic: match_topic,
        qos,
        page,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
