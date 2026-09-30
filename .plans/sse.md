# Plan: SSE that holds up on Cloudflare

Tracked in issue #3.

Goal: a client watching `GET /api/notes/watch` (raw, TypeScript SDK, Go SDK, CLI) never misses a note and never sits on a dead stream: across deploys, runtime updates, idle hours and hub restarts. The Durable Object stays hibernatable.

## What Cloudflare guarantees (docs, checked 2026-09-30)

- **HTTP streaming has no duration limit** while the client is connected. A Worker streaming a body bills CPU time, not wall time.
- **Runtime updates happen a few times a week.** In-flight requests get 30 s, then they're killed. Our own deploys cut streams too.
- **A deploy restarts every Durable Object** and disconnects all its WebSockets.
- **Only a Durable Object acting as a WebSocket server hibernates** (after about 10 s idle). Outgoing WebSockets don't hibernate. An SSE response held by a DO keeps it in memory and billed. So streams live in the Worker and the hub is a hibernatable WebSocket server. That's the "WebSocket proxy" trick from issue #1, and we already have it.
- **Proxy timeouts:** proxy idle is 900 s and proxy read is 125 s. oRPC 2.0 sends an SSE keep-alive comment every 15 s by default.

## What we found in our stack

- **Silent dead stream (to verify first).** In `@orpc/cloudflare`'s `DurablePublisher`, if the hub socket closes with code 1000 or 1001, no error is raised. A hub restart would likely close with 1001 ("going away"). The Worker's SSE stream would then stay open with keep-alives but never deliver another note, and the client has no reason to reconnect.
- **Resume works:** 60 s retention, and `Last-Event-ID` replays missed notes. Proven with our raw client only.
- **Client reconnection is unknown** for Fern's TypeScript/Go SDKs and the CLI's `notes watch`.

## The tricks, in order

1. **Hub-restart proof test first (`api/sse-soak.mjs`).** Open SSE clients (raw, TypeScript SDK, Go SDK, CLI) and a WebSocket client. Publish a note every few seconds, redeploy mid-stream, keep publishing, then report per client: notes lost, duplicated, time to recover. Also log the close code the Worker sees from the hub. This gives the baseline, and says whether the silent dead stream is real.
2. **Resubscribe inside the Worker.** When the hub socket drops, the Worker reconnects to the hub with the last event id it delivered. The DO replays from its resume log, and the client's SSE stream never notices the restart.
   - This needs a signal on every close. If `DurablePublisher` hides 1000/1001, report it to oRPC with the test as the reproduction. Until it's fixed, use a thin subscriber of our own (about 40 lines against the hub's `/subscribe` endpoint).
3. **Rotate streams on purpose.** The server ends each stream after N minutes (say 5–10) and sends `retry: <ms>`. Clients reconnect with `Last-Event-ID` on our schedule, so a runtime update's 30 s kill rarely lands mid-stream. The `seconds` input already does this per request; make it a server default with a cap.
4. **Client reconnection.** Browsers' `EventSource` reconnects and sends `Last-Event-ID` on its own. For Fern's SDKs and CLI, test it (step 1). If they don't reconnect, add a small wrapper in the SDK or ask Fern for reconnect with `Last-Event-ID`; the fix belongs upstream, as with cf.
5. **Resume window.** Raise retention from 60 s to something like 10 minutes, so a phone that slept or a client that retries slowly still catches up. The cost is SQLite rows in one DO; check that the alarm cleanup keeps it small.
6. **Headers and buffering.** Check what the response sends (`Content-Type: text/event-stream`, `Cache-Control: no-cache`). Measure time to first event with `Accept-Encoding: br, gzip`, to prove nothing on Cloudflare's path compresses or buffers the stream. Add `no-transform` if it does.
7. **Fan-out at scale (later, only if needed).** Today each SSE client is its own WebSocket into the hub; the hub limit is 32,768 sockets. A shared subscription per Worker isolate (one hub socket, many SSE streams in memory) or sharding the hub per topic would lift that. Only worth it with real traffic.
8. **Offer WebSockets where the client can use them.** Cloudflare recommends that WebSockets end on a hibernating DO. That's step 2 of [asyncapi.md](asyncapi.md) (`/api/notes/live` from the contract). SSE stays for the SDKs, the CLI and anything behind proxies that block WebSockets.

## Done when

- The soak test passes: with a redeploy mid-stream, every client gets every note exactly once (or a duplicate, if we decide that's allowed).
- A stream idle for 20+ minutes still delivers.
- The results, including the DO close code and the SDK/CLI reconnect behaviour, are in FINDINGS.md.
- Any oRPC or Fern issue has been filed with its reproduction (outward-facing; needs a go-ahead).

## Costs to watch

- Every soak run redeploys the `cftest-api` test Worker and writes test notes.
- Keep it to a few runs; `mise run cleanup` covers the resources.
