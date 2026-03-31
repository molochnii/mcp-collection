# MCP Collection

Collection of MCP (Model Context Protocol) servers for local AI infrastructure.

## Servers

| Name | Description | Status |
|------|-------------|--------|
| [LocalSpeakR](./local-speakr/) | MCP server for [Speakr](https://github.com/murtaza-nasir/speakr) — local AI transcription platform | ✅ Ready |

## Usage

Each MCP server is a standalone Node.js package. See individual README for setup instructions.

### General setup

1. Clone this repo
2. `cd` into the server directory
3. `npm install && npm run build`
4. Add to your AI client config (see server README)

## Adding new servers

Each server lives in its own directory with independent `package.json`.
