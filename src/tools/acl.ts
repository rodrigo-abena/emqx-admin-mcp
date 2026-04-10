import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerAclTools(server: McpServer) {
  server.tool(
    "list_auth_sources",
    "List all configured authorization sources (file, built-in DB, HTTP, etc.) and their status.",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/authorization/sources");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_auth_metrics",
    "Get authorization metrics: allow/deny counters, cache hits, broken down by source.",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/prometheus/auth");
      return { content: [{ type: "text", text: typeof data === "string" ? data : JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "reload_acl_file",
    [
      "Hot-reload the file-based ACL rules without restarting EMQX.",
      "EMQX v5/v6 only reads acl.conf at startup — this API call forces an immediate reload.",
      "Run this after updating the ACL ConfigMap and waiting for the pod to remount it.",
    ].join(" "),
    { environment: envSchema },
    async ({ environment }) => {
      // GET the current file source config first so we can PUT it back (triggering reload)
      const resp = await emqx.get<{ sources: Array<{ type: string; enable: boolean; path?: string }> }>(
        environment as Environment,
        "/authorization/sources"
      );
      const sourceList = Array.isArray(resp) ? resp : resp.sources ?? [];
      const fileSource = sourceList.find((s) => s.type === "file");
      if (!fileSource) {
        return {
          content: [{ type: "text", text: "No file-based authorization source found. Nothing to reload." }],
        };
      }
      await emqx.put(environment as Environment, "/authorization/sources/file", fileSource);
      return {
        content: [{ type: "text", text: "ACL file reloaded successfully. New rules are now active." }],
      };
    }
  );

  server.tool(
    "get_authorization_settings",
    "Get global authorization settings: no_match behaviour, deny_action, cache configuration.",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/authorization/settings");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );
}
