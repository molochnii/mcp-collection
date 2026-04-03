# LocalSpeakR — MCP Server

MCP server for [Speakr](https://github.com/murtaza-nasir/speakr) — self-hosted AI transcription platform.

## Quick Setup

```bash
cd local-speakr
npm install
npm run build
npm run setup
```

The setup script will ask for your Speakr URL and API token, then automatically add the MCP server config to both **Claude Code CLI** (`~/.claude/settings.json`) and **Claude Desktop** (`claude_desktop_config.json`).

Restart Claude Code / Claude Desktop after setup.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SPEAKR_URL` | No | Speakr instance URL (default: `http://172.22.252.179:8899`) |
| `SPEAKR_TOKEN` | Yes | API token from Speakr settings |

### Getting an API token

1. Open Speakr web UI → Settings → API
2. Generate a new API token
3. Copy and use as `SPEAKR_TOKEN`

## Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "local-speakr": {
      "command": "node",
      "args": ["/path/to/mcp-collection/local-speakr/dist/index.js"],
      "env": {
        "SPEAKR_URL": "http://172.22.252.179:8899",
        "SPEAKR_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (Mac) or `%APPDATA%/Claude/claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "local-speakr": {
      "command": "node",
      "args": ["/path/to/mcp-collection/local-speakr/dist/index.js"],
      "env": {
        "SPEAKR_URL": "http://172.22.252.179:8899",
        "SPEAKR_TOKEN": "your-token-here"
      }
    }
  }
}
```

## Available tools

| Tool | Description |
|------|-------------|
| `list_recordings` | List recordings with search, filters, pagination |
| `get_recording` | Get recording details by ID |
| `get_transcript` | Get transcript (json/text/srt/vtt) |
| `transcribe_recording` | Start transcription |
| `get_summary` | Get AI summary |
| `summarize_recording` | Generate AI summary |
| `update_recording` | Update title/notes |
| `delete_recording` | Delete a recording |
| `chat_with_recording` | Ask AI questions about recording content |
| `upload_recording` | Upload audio/video file |
| `list_speakers` | List all speakers |
| `list_tags` | List all tags |
| `manage_tags` | Add/remove tags on a recording |
| `get_stats` | Dashboard statistics |
| `batch_transcribe` | Batch transcription for multiple recordings |
