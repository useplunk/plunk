# @plunk/mcp

The official [Model Context Protocol](https://modelcontextprotocol.io) server for
[Plunk](https://www.useplunk.com). It lets an AI agent send transactional email, manage contacts and
segments, and draft and send campaigns in your Plunk project.

Works with the hosted product and with self-hosted instances.

## Setup

You need a **secret key** (`sk_…`) from your project's **Settings → API Keys** in the Plunk dashboard.

### Claude Code

```bash
claude mcp add plunk --env PLUNK_API_KEY=sk_your_key -- npx -y @plunk/mcp
```

### Claude Desktop, Cursor, and other clients

```json
{
  "mcpServers": {
    "plunk": {
      "command": "npx",
      "args": ["-y", "@plunk/mcp"],
      "env": {
        "PLUNK_API_KEY": "sk_your_key"
      }
    }
  }
}
```

### Self-hosted Plunk

Point `PLUNK_API_URL` at your own API domain:

```json
{
  "mcpServers": {
    "plunk": {
      "command": "npx",
      "args": ["-y", "@plunk/mcp"],
      "env": {
        "PLUNK_API_KEY": "sk_your_key",
        "PLUNK_API_URL": "https://api.your-domain.com"
      }
    }
  }
}
```

## Configuration

| Variable                        | Required | Description                                                                                                |
| ------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------- |
| `PLUNK_API_KEY`                 | yes      | Your project's secret key (`sk_…`).                                                                          |
| `PLUNK_API_URL`                 | no       | API base URL. Defaults to the hosted API. Set this when self-hosting.                                        |
| `PLUNK_PUBLIC_KEY`              | no       | Public key (`pk_…`). Lets `plunk_track_event` use the tracking endpoint directly — see below.                 |
| `PLUNK_READ_ONLY`               | no       | `true` registers only read-only tools. Nothing can be created, changed, sent, or deleted.                     |
| `PLUNK_ALLOW_UNCONFIRMED_SENDS` | no       | `true` skips the confirmation prompt before sends. For headless automation only.                             |
| `PLUNK_MCP_API_KEY`             | no       | Takes precedence over `PLUNK_API_KEY`. Use it if `PLUNK_API_KEY` is already taken in your environment.        |
| `PLUNK_MCP_API_URL`             | no       | Takes precedence over `PLUNK_API_URL`, for the same reason.                                                  |

Flags `--read-only` and `--api-url=<url>` do the same as their environment variables and win over them.

> **Note on `PLUNK_API_KEY`:** if you self-host Plunk, the Plunk API server also uses a variable called
> `PLUNK_API_KEY` for its own platform notification emails. That key belongs to a *different* project.
> If both are present in the same environment, set `PLUNK_MCP_API_KEY` so the agent talks to the project
> you mean.

## Tools

Read-only tools (the only ones registered when `PLUNK_READ_ONLY=true`):

| Tool                   | Description                                     |
| ---------------------- | ----------------------------------------------- |
| `plunk_list_contacts`  | Browse or search contacts, cursor-paginated     |
| `plunk_get_contact`    | Fetch one contact by ID                         |
| `plunk_verify_email`   | Check whether an address is deliverable         |
| `plunk_list_templates` | List reusable email templates                   |
| `plunk_list_campaigns` | List campaigns and their status                 |
| `plunk_list_segments`  | List audience segments                          |

Writing tools:

| Tool                    | Description                                              |
| ----------------------- | -------------------------------------------------------- |
| `plunk_create_contact`  | Create or update a contact (upsert)                      |
| `plunk_update_contact`  | Change an existing contact                               |
| `plunk_delete_contact`  | Permanently delete a contact *(destructive)*             |
| `plunk_send_email`      | Send a transactional email to specific recipients        |
| `plunk_track_event`     | Record an event, which can trigger automation workflows  |
| `plunk_create_template` | Create a reusable template                               |
| `plunk_create_campaign` | Create a campaign as a draft                             |
| `plunk_send_campaign`   | Send or schedule a campaign *(destructive, irreversible)* |
| `plunk_create_segment`  | Create an audience segment                               |

## Safety

Plunk's secret key is all-or-nothing over its project, so this server adds its own guardrails:

- **Sends require human confirmation.** `plunk_send_campaign`, and `plunk_send_email` with more than
  one recipient, ask you to confirm before anything goes out, and the prompt tells you how many people
  will receive it. Confirmation is not a tool argument, so the model cannot grant it to itself.
  Clients that cannot show a prompt cannot send — set `PLUNK_ALLOW_UNCONFIRMED_SENDS=true` if you are
  running headless and accept that.
- **Read-only mode is enforced by registration**, not by convention. With `PLUNK_READ_ONLY=true` the
  mutating tools are never registered, so they cannot be called even by name.
- **Billing, project deletion, and key rotation are unreachable.** Those endpoints require a dashboard
  session, not an API key, so no tool here can touch them.

An API key still grants full read and write access to its project's data. Use a separate Plunk project
for anything you would not want an agent to change.

## Event tracking and the two key types

Plunk's `/v1/track` endpoint requires the **public** key, and it is the only endpoint that does.
Without `PLUNK_PUBLIC_KEY`, `plunk_track_event` gets the same result with the secret key by upserting
the contact first and then recording the event against it. Both paths create the contact if it does
not exist. Setting `PLUNK_PUBLIC_KEY` just makes it one request instead of two.

## Development

```bash
yarn workspace @plunk/mcp build
yarn vitest run apps/mcp

# Explore the server interactively
PLUNK_API_KEY=sk_… npx @modelcontextprotocol/inspector node apps/mcp/dist/index.js
```

## License

AGPL-3.0-only, same as the rest of Plunk.
