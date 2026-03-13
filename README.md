# ai-starter

Minimal AI playground for local development with OpenAI Responses API.

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

## Setup

```bash
cp .env.example .env
```

Set `OPENAI_API_KEY` in `.env`.

## Run

### Local

```bash
npm install
npm run dev
```

### Docker

```bash
docker compose up --build
```

Open [http://localhost:3001](http://localhost:3001)

## Endpoints

- `GET /api/health`
- `POST /api/chat`
