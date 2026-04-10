import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerClientTools(server: McpServer) {
  server.tool(
    "list_clients",
    "List connected MQTT clients. Supports filtering by clientid, username, or IP address.",
    {
      environment: envSchema,
      clientid: z.string().optional().describe("Filter by client ID (exact match)"),
      username: z.string().optional().describe("Filter by username (exact match)"),
      ip_address: z.string().optional().describe("Filter by client IP address"),
      page: z.number().int().min(1).default(1).describe("Page number"),
      limit: z.number().int().min(1).max(1000).default(50).describe("Results per page (max 1000)"),
    },
    async ({ environment, clientid, username, ip_address, page, limit }) => {
      const data = await emqx.get(environment as Environment, "/clients", {
        clientid,
        username,
        ip_address,
        page,
        limit,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_client",
    "Get full details for a specific connected client (IP, protocol, subscriptions, keepalive, etc.).",
    {
      environment: envSchema,
      clientid: z.string().describe("Client ID to look up"),
    },
    async ({ environment, clientid }) => {
      const data = await emqx.get(environment as Environment, `/clients/${encodeURIComponent(clientid)}`);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "disconnect_client",
    "Force-disconnect a client from the broker. The client will need to reconnect.",
    {
      environment: envSchema,
      clientid: z.string().describe("Client ID to disconnect"),
    },
    async ({ environment, clientid }) => {
      await emqx.delete(environment as Environment, `/clients/${encodeURIComponent(clientid)}`);
      return { content: [{ type: "text", text: `Client '${clientid}' has been disconnected.` }] };
    }
  );
}
