import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerMetricsTools(server: McpServer) {
  server.tool(
    "get_stats",
    "Get broker-wide counters: connections, topics, subscriptions, retained messages, sessions.",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/stats");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "list_alarms",
    "List active and historical alarms (high memory, high CPU, too many connections, etc.).",
    {
      environment: envSchema,
      activated: z
        .boolean()
        .optional()
        .describe("true = only active alarms, false = only cleared alarms, omit = all"),
    },
    async ({ environment, activated }) => {
      const data = await emqx.get(environment as Environment, "/alarms", {
        activated: activated !== undefined ? String(activated) : undefined,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_prometheus_stats",
    "Get raw Prometheus-format metrics text (suitable for scraping or detailed inspection).",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/prometheus/stats");
      return {
        content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }],
      };
    }
  );
}
