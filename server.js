import http from "node:http";
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

loadEnv(path.join(__dirname, ".env"));

const port = Number(process.env.PORT ?? 3001);
const defaultModel = process.env.OPENAI_MODEL ?? "gpt-5";
const availableModels = ["gpt-5", "gpt-5-mini", "gpt-4.1-mini"];
const demoMode = process.env.DEMO_MODE === "1";
const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const sendJson = (res, statusCode, body) => {
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(body, null, 2));
};

const sendFile = async (res, filePath, contentType) => {
  const content = await readFile(filePath);
  res.writeHead(200, { "content-type": contentType });
  res.end(content);
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/") {
    return sendFile(res, path.join(__dirname, "web", "index.html"), "text/html; charset=utf-8");
  }

  if (req.method === "GET" && url.pathname === "/styles.css") {
    return sendFile(res, path.join(__dirname, "web", "styles.css"), "text/css; charset=utf-8");
  }

  if (req.method === "GET" && url.pathname === "/app.js") {
    return sendFile(res, path.join(__dirname, "web", "app.js"), "application/javascript; charset=utf-8");
  }

  if (req.method === "GET" && url.pathname === "/api/health") {
    return sendJson(res, 200, {
      ok: true,
      defaultModel,
      availableModels,
      hasApiKey: Boolean(process.env.OPENAI_API_KEY),
      demoMode
    });
  }

  if (req.method === "POST" && url.pathname === "/api/chat") {
    if (!client && !demoMode) {
      return sendJson(res, 400, {
        error: "OPENAI_API_KEY is missing. Add it to .env first."
      });
    }

    const body = await readJson(req);
    const prompt = String(body.prompt ?? "").trim();
    const context = String(body.context ?? "").trim();
    const system = String(body.system ?? "").trim();
    const selectedModel = String(body.model ?? defaultModel).trim() || defaultModel;
    const shouldStream = Boolean(body.stream);
    const history = Array.isArray(body.history) ? body.history : [];

    if (!prompt) {
      return sendJson(res, 400, { error: "Prompt is required." });
    }

    if (!availableModels.includes(selectedModel)) {
      return sendJson(res, 400, {
        error: `Model must be one of: ${availableModels.join(", ")}`
      });
    }

    try {
      const transcript = history
        .filter(item => item && typeof item.role === "string" && typeof item.content === "string")
        .slice(-12)
        .map(item => `${item.role.toUpperCase()}:\n${item.content.trim()}`)
        .join("\n\n");
      const currentTurn = context ? `Context:\n${context}\n\nPrompt:\n${prompt}` : prompt;
      const finalInput = transcript ? `${transcript}\n\nUSER:\n${currentTurn}` : currentTurn;

      if (demoMode && !client) {
        const output = buildDemoResponse({
          model: selectedModel,
          system,
          prompt,
          context,
          history
        });

        if (shouldStream) {
          res.writeHead(200, {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive"
          });

          for (const chunk of chunkText(output, 24)) {
            res.write(chunk);
            await sleep(25);
          }

          res.end();
          return;
        }

        return sendJson(res, 200, {
          ok: true,
          model: selectedModel,
          output
        });
      }

      if (shouldStream) {
        res.writeHead(200, {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-cache, no-transform",
          connection: "keep-alive"
        });

        const stream = await client.responses.create({
          model: selectedModel,
          instructions: system || "You are a concise and practical coding assistant.",
          input: finalInput,
          stream: true
        });

        for await (const event of stream) {
          if (event.type === "response.output_text.delta") {
            res.write(event.delta);
          }
        }

        res.end();
        return;
      }

      const response = await client.responses.create({
        model: selectedModel,
        instructions: system || "You are a concise and practical coding assistant.",
        input: finalInput
      });

      return sendJson(res, 200, {
        ok: true,
        model: selectedModel,
        output: response.output_text
      });
    } catch (error) {
      return sendJson(res, 500, {
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return sendJson(res, 404, { error: "Not Found" });
});

server.listen(port, () => {
  console.log(`ai-starter listening on http://localhost:${port}`);
});

function loadEnv(filePath) {
  try {
    const text = requireText(filePath);
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const index = trimmed.indexOf("=");
      if (index === -1) continue;
      const key = trimmed.slice(0, index).trim();
      const value = trimmed.slice(index + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {}
}

function requireText(filePath) {
  return readFileSync(filePath, "utf8");
}

function buildDemoResponse({ model, system, prompt, context, history }) {
  const recentTurns = Array.isArray(history) ? history.length : 0;
  const summary = [
    "Demo mode is active, so this response is generated locally without calling the OpenAI API.",
    "",
    `Model selected: ${model}`,
    `System prompt set: ${system ? "yes" : "no"}`,
    `Previous turns in session: ${recentTurns}`,
    "",
    "Prompt summary:",
    `- ${trimText(prompt, 180)}`,
    "",
    context
      ? `Context summary:\n- ${trimText(context.replace(/\s+/g, " "), 220)}`
      : "Context summary:\n- No extra context was attached.",
    "",
    "Suggested next step:",
    "- Add a real OPENAI_API_KEY when you want actual model output."
  ];

  return summary.join("\n");
}

function chunkText(text, size) {
  const chunks = [];
  for (let index = 0; index < text.length; index += size) {
    chunks.push(text.slice(index, index + size));
  }
  return chunks;
}

function trimText(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
    });
    req.on("end", () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}
