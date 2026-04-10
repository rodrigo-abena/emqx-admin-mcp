import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerTracingTools(server: McpServer) {
  server.tool(
    "list_traces",
    "List all active log traces (by client ID, topic, or IP).",
    { environment: envSchema },
    async ({ environment }) => {
      const data = await emqx.get(environment as Environment, "/trace");
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "create_trace",
    [
      "Start a real-time log trace to capture detailed debug logs for a specific client, topic, or IP.",
      "Traces are written to an in-memory log and retrievable via get_trace_log.",
      "Always delete traces when done to avoid memory pressure.",
    ].join(" "),
    {
      environment: envSchema,
      name: z.string().describe("Unique name for this trace (e.g. 'debug-device-abc')"),
      type: z.enum(["clientid", "topic", "ip_address"]).describe("What to trace"),
      filter: z.string().describe("The value to trace (client ID, topic, or IP address)"),
      level: z
        .enum(["debug", "info", "warning", "error"])
        .default("debug")
        .describe("Minimum log level to capture"),
      duration: z
        .number()
        .int()
        .min(10)
        .max(3600)
        .default(300)
        .describe("How long (seconds) to keep the trace active. Max 3600."),
    },
    async ({ environment, name, type, filter, level, duration }) => {
      const start = Math.floor(Date.now() / 1000);
      const payload: Record<string, unknown> = {
        name,
        type,
        [type]: filter,
        level,
        start_at: start,
        end_at: start + duration,
      };
      const data = await emqx.post(environment as Environment, "/trace", payload);
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "get_trace_log",
    "Fetch captured log lines from an active or recently completed trace.",
    {
      environment: envSchema,
      name: z.string().describe("Trace name"),
      bytes: z
        .number()
        .int()
        .min(1)
        .max(1048576)
        .default(65536)
        .describe("Maximum bytes of log content to return (default 64 KiB)"),
    },
    async ({ environment, name, bytes }) => {
      const data = await emqx.get(environment as Environment, `/trace/${encodeURIComponent(name)}/log_detail`, {
        bytes,
      });
      return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
    }
  );

  server.tool(
    "delete_trace",
    "Stop and remove a log trace. Always clean up traces after debugging.",
    {
      environment: envSchema,
      name: z.string().describe("Trace name to delete"),
    },
    async ({ environment, name }) => {
      await emqx.delete(environment as Environment, `/trace/${encodeURIComponent(name)}`);
      return { content: [{ type: "text", text: `Trace '${name}' deleted.` }] };
    }
  );
}
