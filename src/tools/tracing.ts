import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import AdmZip from "adm-zip";
import { emqx, EmqxApiError } from "../emqx-client.js";
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
      duration: z
        .number()
        .int()
        .min(10)
        .max(3600)
        .default(300)
        .describe("How long (seconds) to keep the trace active. Max 3600."),
    },
    async ({ environment, name, type, filter, duration }) => {
      const start = Math.floor(Date.now() / 1000);
      const payload: Record<string, unknown> = {
        name,
        type,
        [type]: filter,
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
      node: z.string().optional().describe("Node name to download from. If omitted, the first node with data is used."),
      bytes: z
        .number()
        .int()
        .min(1)
        .max(1048576)
        .default(65536)
        .describe("Maximum bytes of log content to return (default 64 KiB)"),
    },
    async ({ environment, name, node, bytes }) => {
      // EMQX buffers trace events in memory and only flushes to disk when the trace stops.
      // log_size in list_traces/log_detail reflects on-disk size only — it reads 0 while
      // running even if events are captured. Always attempt download; handle 404 gracefully.
      let targetNode = node;
      if (!targetNode) {
        const detail = await emqx.get<Array<{ node: string; size: number }>>(
          environment as Environment,
          `/trace/${encodeURIComponent(name)}/log_detail`
        );
        if (!detail || detail.length === 0) {
          return { content: [{ type: "text", text: "No nodes found for this trace." }] };
        }
        // Prefer node with flushed data; fall back to first node
        targetNode = (detail.find((n) => n.size > 0) ?? detail[0]).node;
      }

      let zipBuffer: Buffer;
      try {
        zipBuffer = await emqx.getBuffer(
          environment as Environment,
          `/trace/${encodeURIComponent(name)}/download`,
          { node: targetNode, bytes }
        );
      } catch (err) {
        if (err instanceof EmqxApiError && err.status === 404) {
          // Check if trace is still running — if so, data is still in memory buffer
          const traces = await emqx.get<Array<{ name: string; status: string }>>(
            environment as Environment,
            "/trace"
          );
          const trace = traces.find((t) => t.name === name);
          if (trace?.status === "running") {
            return {
              content: [{
                type: "text",
                text: "Trace is still running — log data is buffered in memory and will be flushed to disk when the trace stops. Use delete_trace to stop it early and trigger the flush.",
              }],
            };
          }
          return { content: [{ type: "text", text: "No log data found. The trace may have captured no events." }] };
        }
        throw err;
      }

      const zip = new AdmZip(zipBuffer);
      const entries = zip.getEntries();
      if (entries.length === 0) {
        return { content: [{ type: "text", text: "ZIP archive was empty." }] };
      }
      const logText = entries.map((e) => e.getData().toString("utf8")).join("\n");
      return { content: [{ type: "text", text: logText }] };
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
