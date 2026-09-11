# Upcoming Tasks & Roadmap

This document outlines the next logical steps for **ReckonMe!** to transition from a production-ready UI/UX prototype to a globally scalable, fully launched product.

## Phase 1: Backend State Refactor (Redis)
- [ ] Set up a managed Redis instance (e.g., Upstash or AWS ElastiCache).
- [ ] Refactor `roomStore` on the backend to read/write state to Redis instead of local memory.
- [ ] Implement `@socket.io/redis-adapter` to support multiple Node.js processes.
- [ ] Test multi-server functionality locally by spinning up two backend processes on different ports.

## Phase 2: Content Pipeline (Millions of Questions)
- [ ] Set up the primary Database (MongoDB or PostgreSQL).
- [ ] Create a Question Seeder script to ingest the initial batch of thousands of questions.
- [ ] Update the game logic to fetch randomized question batches from the DB on game start, caching them in Redis for the duration of the room.
- [ ] (Optional) Build a simple Admin Dashboard to add/edit/disable questions dynamically without redeploying.

## Phase 3: Infrastructure & Load Testing
- [ ] Write stress tests using [Artillery](https://www.artillery.io/) or [k6](https://k6.io/) specifically targeting WebSocket connections.
- [ ] Simulate 1,000, 5,000, and 10,000 concurrent bot connections making random guesses to monitor server CPU, memory, and Redis latency.
- [ ] Configure Dockerfiles for both Client and Server for containerized deployment.

## Phase 4: Production Deployment
- [ ] Deploy the Client (Vite build) to Vercel, Netlify, or Cloudflare Pages for CDN-backed speed.
- [ ] Deploy the Server to AWS (ECS/EKS) or Render with Auto-scaling enabled.
- [ ] Configure the Load Balancer with Sticky Sessions.
- [ ] Implement strict CORS policies and Rate Limiting to secure the live endpoints.

## Phase 5: Post-Launch Polish
- [ ] Add sound effects (SFX) and background music (BGM) utilizing the Howler.js library.
- [ ] Integrate analytics (e.g., PostHog or Google Analytics) to track player drop-off rates and popular questions.
- [ ] Add localization (i18n) support if expanding to non-English audiences.
