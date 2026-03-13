import assert from "node:assert/strict";

const baseUrl = process.env.BASE_URL ?? "http://localhost:3001";

const healthResponse = await fetch(`${baseUrl}/api/health`);
assert.equal(healthResponse.status, 200, "health endpoint should return 200");

const health = await healthResponse.json();
assert.equal(health.ok, true, "health payload should mark service as ok");

const chatResponse = await fetch(`${baseUrl}/api/chat`, {
  method: "POST",
  headers: {
    "content-type": "application/json"
  },
  body: JSON.stringify({
    prompt: "hello"
  })
});

if (health.demoMode) {
  assert.equal(chatResponse.status, 200, "chat in demo mode should succeed");
  const chat = await chatResponse.json();
  assert.equal(chat.ok, true, "demo mode should return ok");
  assert.match(chat.output, /Demo mode/i, "demo mode output should explain itself");
  console.log("smoke test passed");
  process.exit(0);
}

assert.equal(chatResponse.status, 400, "chat without API key should fail with 400");

const chat = await chatResponse.json();
assert.match(chat.error, /OPENAI_API_KEY/i, "error should explain missing API key");

console.log("smoke test passed");
