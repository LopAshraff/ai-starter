const systemEl = document.querySelector("#system");
const promptEl = document.querySelector("#prompt");
const runEl = document.querySelector("#run");
const copyEl = document.querySelector("#copy");
const resultEl = document.querySelector("#result");
const statusEl = document.querySelector("#status");

runEl.addEventListener("click", async () => {
  statusEl.textContent = "Running...";
  resultEl.textContent = "Waiting for response...";

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
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
    statusEl.textContent = "Done";
  } catch (error) {
    resultEl.textContent = error instanceof Error ? error.message : "Unknown error.";
    statusEl.textContent = "Error";
  }
});

copyEl.addEventListener("click", async () => {
  await navigator.clipboard.writeText(resultEl.textContent);
  statusEl.textContent = "Copied";
});
