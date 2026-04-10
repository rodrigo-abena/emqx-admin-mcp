import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerClusterTools(server: McpServer) {
  server.tool(
    "get_cluster_status",
    "Get status of all nodes in the EMQX cluster (uptime, version, memory, connections per node).",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/nodes");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_node_details",
    "Get detailed information about a specific EMQX cluster node.",
    {
      environment: envSchema,
      node: z.string().describe("Node name, e.g. emqx@emqx-0.emqx-headless.abena-aquatime.svc"),
    },
    async ({ environment, node }) => {
      const data = await emqx.get(environment as Environment, `/nodes/${encodeURIComponent(node)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_current_metrics",
    "Get live system metrics: active connections, message throughput, memory usage, CPU.",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/monitor_current");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
