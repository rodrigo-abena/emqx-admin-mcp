#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerClusterTools } from "./tools/cluster.js";
import { registerClientTools } from "./tools/clients.js";
import { registerSubscriptionTools } from "./tools/subscriptions.js";
import { registerAclTools } from "./tools/acl.js";
import { registerBannedTools } from "./tools/banned.js";
import { registerTracingTools } from "./tools/tracing.js";
import { registerMetricsTools } from "./tools/metrics.js";
import { registerPublishTools } from "./tools/publish.js";

const server = new McpServer({
  name: "emqx-admin-mcp",
  version: "0.1.0",
});

registerClusterTools(server);
registerClientTools(server);
registerSubscriptionTools(server);
registerAclTools(server);
registerBannedTools(server);
registerTracingTools(server);
registerMetricsTools(server);
registerPublishTools(server);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so it doesn't pollute the MCP stdio stream
  process.stderr.write("emqx-admin-mcp running on stdio\n");
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
