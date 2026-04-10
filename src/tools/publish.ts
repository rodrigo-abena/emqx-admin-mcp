import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { emqx } from "../emqx-client.js";
import type { Environment } from "../config.js";

const envSchema = z.enum(["test", "production"]).default("test");

export function registerPublishTools(server: McpServer) {
  server.tool(
    "publish_message",
    [
      "Publish a diagnostic MQTT message to a topic via the broker's REST API.",
      "Useful for testing subscriptions, verifying ACL rules, or triggering device commands.",
      "The message is injected directly by the broker (no external MQTT client needed).",
    ].join(" "),
    {
      environment: envSchema,
      topic: z.string().describe("MQTT topic to publish to"),
      payload: z.string().describe("Message payload (string)"),
      qos: z.union([z.literal(0), z.literal(1), z.literal(2)]).default(0).describe("QoS level"),
      retain: z.boolean().default(false).describe("Whether to set the retain flag"),
      encoding: z
        .enum(["plain", "base64"])
        .default("plain")
        .describe("Payload encoding. Use 'base64' for binary payloads."),
    },
    async ({ environment, topic, payload, qos, retain, encoding }) => {
      const data = await emqx.post(environment as Environment, "/mqtt/publish", {
        topic,
        payload,
        qos,
        retain,
        encoding,
      });
      return { content: [{ type: "text", text: JSON.stringify(data ?? { status: "published" }, null, 2) }] };
    }
  );
}
