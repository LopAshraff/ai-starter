# ai-starter

[![CI](https://github.com/LopAshraff/ai-starter/actions/workflows/ci.yml/badge.svg)](https://github.com/LopAshraff/ai-starter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](./LICENSE)

Minimal AI workbench for local development with the OpenAI Responses API.

Built for a clean Windows + WSL + Docker workflow. It starts small, but it already feels like a real tool instead of a throwaway demo.

## What It Does

`ai-starter` is a local-first prompt workbench for coding and debugging workflows. You can use it to test prompts, compare models, load reusable prompt setups, attach context, and iterate on multi-turn sessions without dragging in a heavy framework.

## Stack

- Node.js 22
- OpenAI JavaScript SDK
- Plain HTML/CSS/JS frontend
- Small Node server
- Docker support

## Features

- Prompt input with model selection
- Simple system prompt field
- Response output panel
- Health endpoint
- Environment-driven API key
- Smoke test script
- Dev container and VS Code launch config
- Runtime model picker in the UI
- Local prompt history in the browser
- Searchable session history with generated titles
- Lightweight markdown rendering for responses
- One-click preset loading for debugging, review, API design, and explanation
- Save reusable prompt workflows locally in the browser
- Streaming text responses in the UI
- Context textarea and file upload for code, logs, and notes
- Export and import session history as JSON
- Local multi-turn conversation state with a resettable current session

## Quick Start

### Local

```bash
npm install
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`, then run:

```bash
npm run dev
npm run smoke
```

### Docker

Create `.env` first, then run:

```bash
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001)

## Why This Repo Exists

- Start from a working OpenAI integration instead of a blank folder
- Keep the surface area small enough to understand quickly
- Make local development clean on Windows, WSL, or Docker
- Provide a base you can grow into an internal tool or product prototype

## Endpoints

- `GET /api/health`
- `POST /api/chat`

## VS Code

- Press `F5` to launch the app
- Use the `npm: smoke` task to verify the local server

## Security Notes

- Keep real credentials in `.env`, not in tracked files
- `.env` and `.env.local` are already ignored by Git
- Use `.env.example` as the public template

## License

MIT. See [LICENSE](./LICENSE).
