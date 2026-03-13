const systemEl = document.querySelector("#system");
const promptEl = document.querySelector("#prompt");
const contextEl = document.querySelector("#context");
const modelEl = document.querySelector("#model");
const presetEl = document.querySelector("#preset");
const fileEl = document.querySelector("#file");
const runEl = document.querySelector("#run");
const copyEl = document.querySelector("#copy");
const clearHistoryEl = document.querySelector("#clear-history");
const exportSessionEl = document.querySelector("#export-session");
const importSessionEl = document.querySelector("#import-session");
const applyPresetEl = document.querySelector("#apply-preset");
const saveNameEl = document.querySelector("#save-name");
const savePromptEl = document.querySelector("#save-prompt");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");
const apiKeyStateEl = document.querySelector("#api-key-state");
const fileStateEl = document.querySelector("#file-state");
const metaEl = document.querySelector("#meta");
const historyEl = document.querySelector("#history");
const savedPromptsEl = document.querySelector("#saved-prompts");
const historyKey = "ai-starter-history";
const savedPromptsKey = "ai-starter-saved-prompts";
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
renderSavedPrompts();

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
        prompt: promptEl.value,
        context: contextEl.value
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

exportSessionEl.addEventListener("click", () => {
  const payload = {
    exportedAt: new Date().toISOString(),
    history: readHistory()
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ai-starter-session.json";
  link.click();
  URL.revokeObjectURL(url);
  statusEl.textContent = "Session exported";
});

importSessionEl.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) return;

  try {
    const text = await file.text();
    const payload = JSON.parse(text);
    const history = Array.isArray(payload.history) ? payload.history : [];
    localStorage.setItem(historyKey, JSON.stringify(history.slice(0, 8)));
    renderHistory();
    statusEl.textContent = "Session imported";
  } catch {
    statusEl.textContent = "Import failed";
  } finally {
    importSessionEl.value = "";
  }
});

applyPresetEl.addEventListener("click", () => {
  const preset = presets.find(item => item.id === presetEl.value);
  if (!preset) return;

  modelEl.value = preset.model;
  systemEl.value = preset.system;
  promptEl.value = preset.prompt;
  statusEl.textContent = `Preset loaded: ${preset.label}`;
});

savePromptEl.addEventListener("click", () => {
  const name = saveNameEl.value.trim();
  if (!name) {
    statusEl.textContent = "Enter a name first";
    saveNameEl.focus();
    return;
  }

  const savedPrompts = readSavedPrompts().filter(item => item.name !== name);
  savedPrompts.unshift({
    name,
    model: modelEl.value,
    system: systemEl.value,
    prompt: promptEl.value,
    context: contextEl.value,
    createdAt: new Date().toISOString()
  });

  localStorage.setItem(savedPromptsKey, JSON.stringify(savedPrompts.slice(0, 12)));
  renderSavedPrompts();
  saveNameEl.value = "";
  statusEl.textContent = `Saved prompt: ${name}`;
});

fileEl.addEventListener("change", async event => {
  const file = event.target.files?.[0];
  if (!file) {
    fileStateEl.textContent = "No file loaded.";
    return;
  }

  const text = await file.text();
  contextEl.value = `# File: ${file.name}\n\n${text}`;
  fileStateEl.textContent = `${file.name} loaded`;
  statusEl.textContent = "Context file loaded";
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

function renderSavedPrompts() {
  const savedPrompts = readSavedPrompts();

  if (!savedPrompts.length) {
    savedPromptsEl.innerHTML = '<p class="empty-state">No saved prompts yet.</p>';
    return;
  }

  savedPromptsEl.innerHTML = savedPrompts
    .map(
      item => `
        <div class="saved-item">
          <div class="saved-copy">
            <strong>${escapeHtml(item.name)}</strong>
            <span>${escapeHtml(item.model)} · ${escapeHtml(trimText(item.prompt || "No prompt", 72))}</span>
          </div>
          <button type="button" data-action="load" data-name="${escapeAttribute(item.name)}">Load</button>
          <button type="button" data-action="delete" data-name="${escapeAttribute(item.name)}">Delete</button>
        </div>
      `
    )
    .join("");

  for (const button of savedPromptsEl.querySelectorAll("button")) {
    button.addEventListener("click", () => {
      const name = button.dataset.name ?? "";
      if (button.dataset.action === "load") {
        loadSavedPrompt(name);
        return;
      }

      deleteSavedPrompt(name);
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

function readSavedPrompts() {
  try {
    return JSON.parse(localStorage.getItem(savedPromptsKey) ?? "[]");
  } catch {
    return [];
  }
}

function loadSavedPrompt(name) {
  const item = readSavedPrompts().find(entry => entry.name === name);
  if (!item) {
    statusEl.textContent = "Saved prompt not found";
    return;
  }

  modelEl.value = item.model ?? modelEl.value;
  systemEl.value = item.system ?? "";
  promptEl.value = item.prompt ?? "";
  contextEl.value = item.context ?? "";
  statusEl.textContent = `Loaded prompt: ${item.name}`;
}

function deleteSavedPrompt(name) {
  const savedPrompts = readSavedPrompts().filter(item => item.name !== name);
  localStorage.setItem(savedPromptsKey, JSON.stringify(savedPrompts));
  renderSavedPrompts();
  statusEl.textContent = `Deleted prompt: ${name}`;
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
