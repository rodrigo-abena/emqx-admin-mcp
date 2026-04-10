# emqx-admin-mcp

MCP server for EMQX broker administration. Exposes EMQX v5/v6 REST API operations as Claude tools — cluster health, client management, ACL hot-reload, log tracing, banned clients, and metrics.

> Built and tested against **EMQX Enterprise 6.2.0** on Kubernetes. Compatible with EMQX v5.x and v6.x (open-source and enterprise editions). The REST API base path `/api/v5` is shared across both major versions.

## Requirements

| Requirement | Version |
|---|---|
| Node.js | ≥ 18 |
| EMQX | v5.x or v6.x (open-source or enterprise) |
| Claude Code / Claude Desktop | any recent version |

An **EMQX API key** is required per environment. Create one in the EMQX Dashboard under **System → API Keys → Create**. The key needs no special role beyond the default — it inherits the REST API access the dashboard user has.

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
| `delete_trace` | Tracing | Remove a trace and its log files |
| `get_stats` | Metrics | Broker counters |
| `list_alarms` | Metrics | Active and historical alarms |
| `get_prometheus_stats` | Metrics | Raw Prometheus metrics text |
| `publish_message` | Publish | Inject a diagnostic message |

Every tool accepts an `environment` parameter: `"test"` (default) or `"production"`.

## Setup

### 1. Create EMQX API keys

In the EMQX Dashboard: **System → API Keys → Create**.
Create one key per environment (test and production).

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

Add to `.mcp.json` in your project root. **Keep this file out of version control** — it contains secrets.

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

## Operational notes

### ACL hot-reload

EMQX v5/v6 reads `acl.conf` only at startup. After updating the file (or a Kubernetes ConfigMap) and waiting for it to remount (~30s), call `reload_acl_file` to push the new rules live without a pod restart.

### Log trace lifecycle

EMQX buffers trace events **in memory** while a trace is running. The buffer is only flushed to disk when the trace **expires naturally** (the `duration` elapses). Calling `delete_trace` on a running trace discards the buffer — log data is lost.

Correct workflow:
1. `create_trace` with an appropriate duration
2. Wait for status to become `stopped` (check with `list_traces`)
3. `get_trace_log` to read the captured events
4. `delete_trace` to clean up

## License

Copyright 2026 Abena A/S

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
