#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- Config ---

const SPEAKR_URL = process.env.SPEAKR_URL || "http://172.22.252.179:8899";
const SPEAKR_TOKEN = process.env.SPEAKR_TOKEN;

if (!SPEAKR_TOKEN) {
  console.error("SPEAKR_TOKEN environment variable is required");
  process.exit(1);
}

const API = `${SPEAKR_URL}/api/v1`;

// --- HTTP helper ---

async function speakrFetch(
  path: string,
  options: RequestInit = {}
): Promise<unknown> {
  const url = `${API}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${SPEAKR_TOKEN}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Speakr API ${res.status}: ${body}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

// --- MCP Server ---

const server = new McpServer({
  name: "LocalSpeakR",
  version: "0.1.0",
});

// -- Tools --

server.tool(
  "list_recordings",
  "List recordings with optional filtering, search, and pagination",
  {
    search: z.string().optional().describe("Search query for title/content"),
    tag: z.string().optional().describe("Filter by tag name"),
    status: z
      .enum(["pending", "processing", "completed", "failed"])
      .optional()
      .describe("Filter by transcription status"),
    page: z.number().optional().describe("Page number (default 1)"),
    per_page: z.number().optional().describe("Items per page (default 20)"),
    sort_by: z
      .enum(["created_at", "title", "duration", "updated_at"])
      .optional()
      .describe("Sort field"),
    sort_order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  },
  async (params) => {
    const query = new URLSearchParams();
    if (params.search) query.set("search", params.search);
    if (params.tag) query.set("tag", params.tag);
    if (params.status) query.set("status", params.status);
    if (params.page) query.set("page", String(params.page));
    if (params.per_page) query.set("per_page", String(params.per_page));
    if (params.sort_by) query.set("sort_by", params.sort_by);
    if (params.sort_order) query.set("sort_order", params.sort_order);

    const qs = query.toString();
    const data = await speakrFetch(`/recordings${qs ? `?${qs}` : ""}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_recording",
  "Get details of a specific recording by ID",
  {
    id: z.number().describe("Recording ID"),
  },
  async ({ id }) => {
    const data = await speakrFetch(`/recordings/${id}`);
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_transcript",
  "Get the transcript of a recording in various formats",
  {
    id: z.number().describe("Recording ID"),
    format: z
      .enum(["json", "text", "srt", "vtt"])
      .optional()
      .describe("Transcript format (default: text)"),
  },
  async ({ id, format }) => {
    const query = format ? `?format=${format}` : "";
    const data = await speakrFetch(`/recordings/${id}/transcript${query}`);
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "transcribe_recording",
  "Start transcription of a recording",
  {
    id: z.number().describe("Recording ID"),
  },
  async ({ id }) => {
    const data = await speakrFetch(`/recordings/${id}/transcribe`, {
      method: "POST",
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "get_summary",
  "Get the AI-generated summary of a recording",
  {
    id: z.number().describe("Recording ID"),
  },
  async ({ id }) => {
    const data = await speakrFetch(`/recordings/${id}/summary`);
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "summarize_recording",
  "Generate an AI summary for a recording",
  {
    id: z.number().describe("Recording ID"),
  },
  async ({ id }) => {
    const data = await speakrFetch(`/recordings/${id}/summarize`, {
      method: "POST",
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "update_recording",
  "Update recording metadata (title, notes)",
  {
    id: z.number().describe("Recording ID"),
    title: z.string().optional().describe("New title"),
    notes: z.string().optional().describe("User notes in markdown"),
  },
  async ({ id, ...fields }) => {
    const body: Record<string, string> = {};
    if (fields.title) body.title = fields.title;
    if (fields.notes) body.notes = fields.notes;

    const data = await speakrFetch(`/recordings/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "delete_recording",
  "Delete a recording by ID",
  {
    id: z.number().describe("Recording ID"),
  },
  async ({ id }) => {
    const data = await speakrFetch(`/recordings/${id}`, { method: "DELETE" });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "chat_with_recording",
  "Ask a question about a recording's content using AI",
  {
    id: z.number().describe("Recording ID"),
    message: z.string().describe("Your question about the recording"),
  },
  async ({ id, message }) => {
    const data = await speakrFetch(`/recordings/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
    const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
    return { content: [{ type: "text" as const, text }] };
  }
);

server.tool(
  "upload_recording",
  "Upload an audio/video file for transcription. Provide a local file path accessible from the server.",
  {
    file_path: z.string().describe("Absolute path to the audio/video file on disk"),
    title: z.string().optional().describe("Recording title"),
    language: z.string().optional().describe("Language code (e.g. 'ru', 'en')"),
    tags: z.array(z.string()).optional().describe("Tags to assign"),
  },
  async ({ file_path, title, language, tags }) => {
    const fs = await import("fs");
    const path = await import("path");

    if (!fs.existsSync(file_path)) {
      return {
        content: [{ type: "text" as const, text: `Error: file not found: ${file_path}` }],
        isError: true,
      };
    }

    const fileBuffer = fs.readFileSync(file_path);
    const fileName = path.basename(file_path);

    const formData = new FormData();
    formData.append("file", new Blob([fileBuffer]), fileName);
    if (title) formData.append("title", title);
    if (language) formData.append("language", language);
    if (tags) tags.forEach((t) => formData.append("tags", t));

    const res = await fetch(`${API}/recordings/upload`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SPEAKR_TOKEN}` },
      body: formData,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Upload failed ${res.status}: ${body}`);
    }

    const data = await res.json();
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_speakers",
  "List all speakers in the system",
  {},
  async () => {
    const data = await speakrFetch("/speakers");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "list_tags",
  "List all tags",
  {},
  async () => {
    const data = await speakrFetch("/tags");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "manage_tags",
  "Add or remove tags from a recording",
  {
    id: z.number().describe("Recording ID"),
    action: z.enum(["add", "remove"]).describe("Action to perform"),
    tags: z.array(z.string()).describe("Tag names"),
  },
  async ({ id, action, tags }) => {
    if (action === "add") {
      const data = await speakrFetch(`/recordings/${id}/tags`, {
        method: "POST",
        body: JSON.stringify({ tags }),
      });
      return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
    } else {
      // Remove tags one by one (API deletes single tag)
      const results = [];
      for (const tag of tags) {
        const data = await speakrFetch(
          `/recordings/${id}/tags/${encodeURIComponent(tag)}`,
          { method: "DELETE" }
        );
        results.push(data);
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    }
  }
);

server.tool(
  "get_stats",
  "Get Speakr dashboard statistics (recordings count, storage, queue, token usage)",
  {},
  async () => {
    const data = await speakrFetch("/stats");
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

server.tool(
  "batch_transcribe",
  "Start batch transcription for multiple recordings",
  {
    ids: z.array(z.number()).describe("Array of recording IDs to transcribe"),
  },
  async ({ ids }) => {
    const data = await speakrFetch("/recordings/batch/transcribe", {
      method: "POST",
      body: JSON.stringify({ ids }),
    });
    return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
  }
);

// --- Start ---

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
