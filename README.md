# emqx-admin-mcp

MCP server for EMQX broker administration. Exposes EMQX v5/v6 REST API operations as Claude tools — cluster health, client management, ACL hot-reload, log tracing, banned clients, and metrics.

## Tools

| Tool | Category | Description |
|---|---|---|
| `get_cluster_status` | Cluster | All nodes: status, uptime, version, memory |
| `get_node_details` | Cluster | Single node detail |
| `get_current_metrics` | Cluster | Live connections, throughput, memory |
| `list_clients` | Clients | Paginated client list with filters |
| `get_client` | Clients | Full detail for one client |
| `disconnect_client` | Clients | Force-disconnect a client |
| `list_subscriptions` | Subscriptions | Active subscriptions with filters |
| `list_auth_sources` | ACL | Configured authorization sources |
| `get_auth_metrics` | ACL | Allow/deny counters |
| `reload_acl_file` | ACL | Hot-reload file-based ACL rules |
| `get_authorization_settings` | ACL | Global authz settings |
| `list_banned` | Banned | All banned clientids, usernames, IPs |
| `ban_client` | Banned | Add a ban entry |
| `unban_client` | Banned | Remove a ban entry |
| `list_traces` | Tracing | Active log traces |
| `create_trace` | Tracing | Start a trace (clientid, topic, or IP) |
| `get_trace_log` | Tracing | Fetch captured log lines |
| `delete_trace` | Tracing | Stop and remove a trace |
| `get_stats` | Metrics | Broker counters |
| `list_alarms` | Metrics | Active and historical alarms |
| `get_prometheus_stats` | Metrics | Raw Prometheus metrics text |
| `publish_message` | Publish | Inject a diagnostic message |

Every tool accepts an `environment` parameter: `"test"` (default) or `"production"`.

## Setup

### 1. Create an EMQX API key

In the EMQX Dashboard: **System → API Keys → Create**.
Create one key per environment.

### 2. Install and build

```bash
npm install
npm run build
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Edit .env with your API keys and URLs
```

### 4. Wire up Claude Code

Add to `.mcp.json` in your project root (keep this file out of version control if it contains secrets):

```json
{
  "mcpServers": {
    "emqx-admin": {
      "command": "node",
      "args": ["/absolute/path/to/emqx-admin-mcp/dist/index.js"],
      "env": {
        "EMQX_TEST_URL": "https://mqtt-admin-test.example.com",
        "EMQX_TEST_API_KEY": "...",
        "EMQX_TEST_API_SECRET": "...",
        "EMQX_PROD_URL": "https://mqtt-admin.example.com",
        "EMQX_PROD_API_KEY": "...",
        "EMQX_PROD_API_SECRET": "..."
      }
    }
  }
}
```

### 5. Wire up Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "emqx-admin": {
      "command": "node",
      "args": ["/absolute/path/to/emqx-admin-mcp/dist/index.js"],
      "env": {
        "EMQX_TEST_URL": "...",
        "EMQX_TEST_API_KEY": "...",
        "EMQX_TEST_API_SECRET": "...",
        "EMQX_PROD_URL": "...",
        "EMQX_PROD_API_KEY": "...",
        "EMQX_PROD_API_SECRET": "..."
      }
    }
  }
}
```

## Development

```bash
npm run dev       # Run with tsx (no build needed)
npm run build     # Compile to dist/
```

## Notes on ACL hot-reload

EMQX v5/v6 reads `acl.conf` only at startup. After updating the ACL ConfigMap in Kubernetes and waiting for the volume to remount (~30s), call `reload_acl_file` to push the new rules live without a pod restart.

## License

MIT
