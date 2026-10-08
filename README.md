# Agent Browser Chat

ChatGPT-style web application for running and monitoring autonomous browsing agent tasks.

## Features

- Chat interface for submitting browsing tasks
- Real-time task monitoring panel with live logs
- Simulated autonomous agent steps (navigating, extracting, summarizing)
- Task history sidebar
- Dark theme UI similar to ChatGPT

## Tech Stack

- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript
- Lucide icons

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy to Vercel

Connect this repository to a Vercel project. It will auto-deploy on push.

## Note

This is a demo frontend with simulated agent execution. For production autonomous browsing, integrate a real browser automation backend (Playwright + LLM agent loop) and a task queue.
