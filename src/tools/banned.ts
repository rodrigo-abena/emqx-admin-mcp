import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

const banAsSchema = z.enum(["clientid", "username", "peerhost"]).describe(
  "What to ban: 'clientid' (client ID), 'username' (MQTT username), or 'peerhost' (IP address)"
);

export function registerBannedTools(server: McpServer) {
  server.tool(
    "list_banned",
    "List all banned client IDs, usernames, and IP addresses.",
    {
      environment: envSchema,
      page: z.number().int().min(1).default(1),
      limit: z.number().int().min(1).max(1000).default(50),
    },
    async ({ environment, page, limit }) => {
      const data = await emqx.get(environment as Environment, "/banned", { page, limit });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "ban_client",
    "Add a ban entry to block a specific client ID, username, or IP address from connecting.",
    {
      environment: envSchema,
      as: banAsSchema,
      who: z.string().describe("The value to ban (client ID, username, or IP)"),
      reason: z.string().optional().describe("Human-readable reason for the ban"),
      until: z
        .number()
        .int()
        .optional()
        .describe("Unix timestamp (seconds) when the ban expires. Omit for permanent ban."),
    },
    async ({ environment, as: banAs, who, reason, until }) => {
      const payload: Record<string, unknown> = { as: banAs, who };
      if (reason) payload.reason = reason;
      if (until !== undefined) payload.until = until;
      const data = await emqx.post(environment as Environment, "/banned", payload);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "unban_client",
    "Remove a ban entry, allowing the client/user/IP to connect again.",
    {
      environment: envSchema,
      as: banAsSchema,
      who: z.string().describe("The value to unban (client ID, username, or IP)"),
    },
    async ({ environment, as: banAs, who }) => {
      await emqx.delete(
        environment as Environment,
        `/banned/${encodeURIComponent(banAs)}/${encodeURIComponent(who)}`
      );
      return { content: [{ type: "text", text: `Ban removed for ${banAs} '${who}'.` }] };
    }
  );
}
