const systemEl = document.querySelector("#system");
const promptEl = document.querySelector("#prompt");
const modelEl = document.querySelector("#model");
const presetEl = document.querySelector("#preset");
const runEl = document.querySelector("#run");
const copyEl = document.querySelector("#copy");
const clearHistoryEl = document.querySelector("#clear-history");
const applyPresetEl = document.querySelector("#apply-preset");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");
const apiKeyStateEl = document.querySelector("#api-key-state");
const metaEl = document.querySelector("#meta");
const historyEl = document.querySelector("#history");
const historyKey = "ai-starter-history";
const presets = [
  {
    id: "debug",
    label: "Debug code",
    model: "gpt-5",
    system: "You are a concise and practical debugging assistant. Explain root cause first, then propose the smallest correct fix.",
    prompt: "Debug this issue. Explain the root cause, the fix, and the most important regression tests."
  },
  {
    id: "review",
    label: "Review changes",
    model: "gpt-5",
    system: "You are a rigorous code reviewer. Prioritize bugs, regressions, and missing tests. Be direct and specific.",
    prompt: "Review this code change and list the most important findings first."
  },
  {
    id: "api",
    label: "Design API",
    model: "gpt-5-mini",
    system: "You are a senior backend engineer. Design APIs with explicit request and response shapes.",
    prompt: "Design a small HTTP API for this feature. Include routes, request bodies, responses, and edge cases."
  },
  {
    id: "explain",
    label: "Explain code",
    model: "gpt-4.1-mini",
    system: "You explain code clearly and briefly. Focus on how it works and why it is structured that way.",
    prompt: "Explain this code in plain language and highlight the key moving parts."
  }
];

await loadHealth();
loadPresets();
renderHistory();

runEl.addEventListener("click", async () => {
  statusEl.textContent = "Running...";
  resultEl.innerHTML = "<p>Waiting for response...</p>";
  metaEl.textContent = `Model: ${modelEl.value}`;
  runEl.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        stream: true,
        model: modelEl.value,
        system: systemEl.value,
        prompt: promptEl.value
      })
    });

    const contentType = response.headers.get("content-type") ?? "";

    if (!response.ok || contentType.includes("application/json")) {
      const data = await response.json();
      resultEl.innerHTML = renderMarkdown(data.error ?? "Request failed.");
      statusEl.textContent = "Error";
      appendHistory({
        prompt: promptEl.value,
        model: modelEl.value,
        output: data.error ?? "Request failed.",
        ok: false
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      fullText += decoder.decode(value, { stream: true });
      resultEl.innerHTML = renderMarkdown(fullText || "No text output.");
      statusEl.textContent = "Streaming...";
    }

    resultEl.innerHTML = renderMarkdown(fullText || "No text output.");
    metaEl.textContent = `Model: ${modelEl.value}`;
    statusEl.textContent = "Done";
    appendHistory({
      prompt: promptEl.value,
      model: modelEl.value,
      output: fullText || "No text output.",
      ok: true
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    resultEl.innerHTML = renderMarkdown(message);
    statusEl.textContent = "Error";
    appendHistory({
      prompt: promptEl.value,
      model: modelEl.value,
      output: message,
      ok: false
    });
  } finally {
    runEl.disabled = false;
  }
});

copyEl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultEl.textContent);
  statusEl.textContent = "Copied";
});

clearHistoryEl.addEventListener("click", () => {
  localStorage.removeItem(historyKey);
  renderHistory();
  statusEl.textContent = "History cleared";
});

applyPresetEl.addEventListener("click", () => {
  const preset = presets.find(item => item.id === presetEl.value);
  if (!preset) return;

  modelEl.value = preset.model;
  systemEl.value = preset.system;
  promptEl.value = preset.prompt;
  statusEl.textContent = `Preset loaded: ${preset.label}`;
});

async function loadHealth() {
  const response = await fetch("/api/health");
  const data = await response.json();

  modelEl.innerHTML = "";
  for (const model of data.availableModels ?? []) {
    const option = document.createElement("option");
    option.value = model;
    option.textContent = model;
    option.selected = model === data.defaultModel;
    modelEl.append(option);
  }

  apiKeyStateEl.textContent = data.hasApiKey ? "Loaded" : "Missing";
  metaEl.textContent = `Default model: ${data.defaultModel}`;
}

function loadPresets() {
  presetEl.innerHTML = presets
    .map(preset => `<option value="${preset.id}">${preset.label}</option>`)
    .join("");
}

function appendHistory(entry) {
  const history = readHistory();
  history.unshift({
    ...entry,
    createdAt: new Date().toISOString()
  });
  localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 8)));
  renderHistory();
}

function renderHistory() {
  const history = readHistory();

  if (!history.length) {
    historyEl.innerHTML = '<p class="empty-state">No prompts yet.</p>';
    return;
  }

  historyEl.innerHTML = history
    .map(
      item => `
        <button class="history-item" data-prompt="${escapeAttribute(item.prompt)}" data-model="${escapeAttribute(item.model)}">
          <span class="history-model">${item.model}</span>
          <strong>${escapeHtml(trimText(item.prompt, 80))}</strong>
          <span class="history-meta">${item.ok ? "Success" : "Error"} · ${new Date(item.createdAt).toLocaleTimeString()}</span>
        </button>
      `
    )
    .join("");

  for (const button of historyEl.querySelectorAll(".history-item")) {
    button.addEventListener("click", () => {
      promptEl.value = button.dataset.prompt ?? "";
      modelEl.value = button.dataset.model ?? modelEl.value;
      statusEl.textContent = "History loaded";
    });
  }
}

function readHistory() {
  try {
    return JSON.parse(localStorage.getItem(historyKey) ?? "[]");
  } catch {
    return [];
  }
}

function trimText(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}...` : text;
}

function escapeHtml(text) {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(text) {
  return escapeHtml(text).replaceAll('"', "&quot;");
}

function renderMarkdown(text) {
  const escaped = escapeHtml(text);
  const codeBlocks = escaped.replace(/```([\s\S]*?)```/g, (_, code) => {
    return `<pre><code>${code.trim()}</code></pre>`;
  });

  const inlineCode = codeBlocks.replace(/`([^`]+)`/g, "<code>$1</code>");
  const paragraphs = inlineCode
    .split(/\n{2,}/)
    .map(block => {
      if (block.startsWith("<pre><code>")) return block;
      return `<p>${block.replace(/\n/g, "<br />")}</p>`;
    })
    .join("");

  return paragraphs;
}
