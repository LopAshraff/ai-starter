const systemEl = document.querySelector("#system");
const promptEl = document.querySelector("#prompt");
const modelEl = document.querySelector("#model");
const runEl = document.querySelector("#run");
const copyEl = document.querySelector("#copy");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");
const apiKeyStateEl = document.querySelector("#api-key-state");
const metaEl = document.querySelector("#meta");

await loadHealth();

runEl.addEventListener("click", async () => {
  statusEl.textContent = "Running...";
  resultEl.textContent = "Waiting for response...";
  metaEl.textContent = `Model: ${modelEl.value}`;
  runEl.disabled = true;

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        model: modelEl.value,
        system: systemEl.value,
        prompt: promptEl.value
      })
    });

    const data = await response.json();

    if (!response.ok) {
      resultEl.textContent = data.error ?? "Request failed.";
      statusEl.textContent = "Error";
      return;
    }

    resultEl.textContent = data.output || "No text output.";
    metaEl.textContent = `Model: ${data.model}`;
    statusEl.textContent = "Done";
  } catch (error) {
    resultEl.textContent = error instanceof Error ? error.message : "Unknown error.";
    statusEl.textContent = "Error";
  } finally {
    runEl.disabled = false;
  }
});

copyEl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultEl.textContent);
  statusEl.textContent = "Copied";
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
