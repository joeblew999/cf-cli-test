# sdk/

Typed SDKs, a CLI and a docs site from OpenAPI specs, with **[Fern](https://buildwithfern.com)** (the `fern-api` npm package, running its generators locally in Docker). Fern is also what Cloudflare's own [Forge](https://github.com/cloudflare/forge) builds `cf` on. Forge itself isn't used here, only its spec of the Cloudflare API, in `sdk:cloudflare`.

`fern/` is a **standard Fern project**, so Fern's own docs apply as they are:

```
fern/
├── fern.config.json          organization + CLI version ("*" = the local CLI)
├── docs.yml                  the docs site: which APIs, titles (mise run sdk:docs)
└── apis/
    ├── petstore/             one folder per API
    │   ├── openapi.json      the spec
    │   └── generators.yml    one group per language, options under config:
    ├── modern/               SSE streaming (x-fern-streaming) + cursor pagination (x-fern-pagination)
    └── showcase/             every feature below, in one API
```

What Fern does through **standard options only**: the spec's OpenAPI features, `x-fern-*` extensions and `generators.yml`. All of it was verified in `showcase/` on 2026-09-29 (Go: build, vet and tests; TypeScript: typecheck).

| Feature | How to switch it on | What the Go SDK gets |
|---|---|---|
| OAuth client credentials | `auth-schemes:` in generators.yml plus a form-encoded token endpoint | `option.WithClientID/WithClientSecret`; token fetched and reused |
| Idempotency | `x-fern-idempotency-headers` plus `x-fern-idempotent: true` | `option.WithIdempotencyKey` |
| Retries | built in (per endpoint: `x-fern-retries`) | `option.WithMaxAttempts` |
| Cursor/offset pagination | `x-fern-pagination` | `*core.Page[...]`, auto-paging |
| SSE / streaming | `x-fern-streaming: { format: sse }` | `core.Stream[T]` |
| File upload | `multipart/form-data` body | typed `UploadFile(...)` |
| Webhooks | OpenAPI 3.1 `webhooks:` | typed payload structs |
| Webhook signatures | `x-fern-webhook-signature` (HMAC or asymmetric) | `WebhooksHelper.verifySignature(...)` (TypeScript), `webhooks_helper.go` (Go). Fern lists this as Enterprise; it generated locally here |
| WebSockets | an `asyncapi.yml` beside the spec, plus TypeScript `generateWebSocketClients: true` | Go: message types only. TypeScript: a reconnecting `LiveNotesSocket` with `connect`, typed `sendSubscribe`, `on('message')` and `close` (needs the `ws` package on Node). Fern lists WS clients as Enterprise; it generated locally here |
| Audiences | `x-fern-audiences` on endpoints plus `audiences: [public]` on a group | one spec gives a full SDK and a public SDK (group `typescript-public` has no internal `uploadFile`) |
| Overlays | `overlays: overlays.yml` beside the spec (OpenAPI Overlay 1.0) | changes the SDK without editing the spec: `notes.listNotes` becomes `notes.list` |

## Does the TypeScript SDK work on Cloudflare Workers? Yes (verified 2026-09-29)

`sdk/harness/` is a Worker made with `mise run new`. It implements the showcase API itself (`/api/mock/*`), and `/api/sdk-test` runs the generated SDK against it inside workerd.

```sh
mise run sdk:harness:sync                             # compiled SDK (group typescript-dist) -> sdk/harness/src/client
mise run sdk:harness:test                             # under cf dev
mise run sdk:harness:deploy                           # cf deploy: cftest-sdk + cftest-sdk-api (recorded for cleanup)
mise run sdk:harness:test --remote                    # on Cloudflare
```

All pass in both places:
- auto-pagination over 3 pages;
- OAuth client credentials (token fetched form-encoded, then reused);
- idempotent create (`Idempotency-Key` plus bearer token);
- an SSE stream of typed chunks;
- webhook HMAC verification (valid signature accepted, forged one rejected);
- the **WebSocket client**, both inside a Worker (on Cloudflare it connects to `cftest-sdk-api`) and from Node over the network, with typed events and the bearer token received.

WebSocket auth in a Worker: the SDK sends the token as a handshake header, which Workers (like browsers) can't set, so from a Worker it never arrives. Fern's docs confirm headers are the only built-in way. The fix uses standard SDK calls: `client.auth.getToken(...)`, then `liveNotes.connect({ queryParams: { access_token } })`, and the server accepts either the header or `?access_token=`.

Two standard options make it Workers-ready:
- **`guardProcessEnvAccess: true`.** Workers have no `process`, and the OAuth code reads `process.env`.
- **`outputSourceFiles: false`** (group `typescript-dist`). Fern compiles the SDK to `.js` plus `.d.ts`, like an npm package. The raw `.ts` source clashes with Cloudflare's Worker types (`Headers`, `Response`); the compiled package typechecks cleanly.

One Cloudflare detail: a Worker calling another Worker on the same `workers.dev` zone needs the `global_fetch_strictly_public` compatibility flag. Without it you get error 1042, and a Worker can never call its own URL.

## A CLI for your API (Fern's CLI generator, Rust)

Group `cli` in `petstore/generators.yml`. Fern's docs call it early access with a `FERN_TOKEN`, but `mise run sdk:gen petstore cli` generated it locally without one (56 s, in Docker). The output is a Rust workspace with a cargo-dist config for 7 targets: macOS, Linux gnu/musl and Windows msvc.

Built and tried on 2026-09-29. The macOS build took 55 s (the first build compiles all dependencies) and gave an 11.7 MB arm64 binary. Against a local mock:
- **Commands per resource:** `petstore pets list-pets`, `create-pet --name rex`.
- **Output and requests:** `--format json|table|yaml|csv|jsonl|http`, `--query` (JMESPath), `--dry-run` (shows the request without sending it), `--base-url`, `--debug`.
- **For agents:** `--schema` gives the command surface as JSON, and `generate-skills` writes Claude-style `SKILL.md` files for the CLI (one shared file, one per resource).
- **Also included:** `auth` login, shell completions and a man page.

**The showcase CLI against the deployed Worker** (`showcase` group `cli`, 2026-09-29):
- These work: OAuth client credentials (token fetched automatically; `--debug` shows `authorization: [REDACTED]`), `notes list`, `notes list --page-all` (3 pages), `notes create --idempotency-key`, `chat` streaming SSE chunks live, and `files upload-file`.
- The OAuth token URL is taken from the spec's `servers` entry, and `--base-url` doesn't move it. So the spec's server is the real API (here, the deployed mock).
- No WebSockets: the CLI generator supports OpenAPI and GraphQL only, not AsyncAPI (Fern's docs; tried with AsyncAPI 3.0 and 2.6).
- A generator bug to avoid: a paginated method on the *root* client (an overlay renaming it with no `x-fern-sdk-group-name`) breaks the Rust build. Keep methods in a group.

Building is **heavy** the first time:
- `mise run sdk:cli:build:linux sdk/out/petstore/cli`: Linux, inside Docker (the container's architecture).
- `mise run sdk:cli:build:mac sdk/out/petstore/cli`: macOS, native (needs Rust).
- All 7 platforms: cargo-dist on GitHub Actions, one native runner per OS, as Fern sets it up. A Linux container can't build macOS binaries (no Apple SDK) or the `windows-msvc` target.

## From an oRPC Worker (api/) to SDKs and a CLI (verified 2026-09-29)

`api/` is an oRPC 2.0 (`2.0.0-beta.40`) Worker, contract first (`api/src/contract.ts`: routes plus Zod 4 schemas). It's implemented on D1 and serves `/api/openapi.json`. The chain:

```sh
mise run api:spec                  # contract -> sdk/fern/apis/api/openapi.json (offline; server = deployed URL)
mise run sdk:gen api go            # + typescript, cli
mise run sdk:check sdk/out/api/go
mise run sdk:cli:build:mac sdk/out/api/cli   # then: cftest-api notes list --page-all / notes watch
mise run api:live-test             # SSE + WebSocket (Durable Object), raw and through the SDK
```

- **Results:** the Go SDK (build, vet, tests) and the TypeScript SDK (typecheck) both pass. The CLI runs against the live Worker: `meta hello`, `notes create`, and `notes list --page-all` across pages.
- **What Fern needs is declared in the oRPC contract,** with no overlay. Each route's `openapi({ operationId, tags, spec })` metadata adds the SDK group and method names, `x-fern-pagination`, `x-fern-streaming`, and the SSE note schema to the generated operation. The only hand-written spec left in `sdk/fern/apis/api/` is `asyncapi.yml`, because oRPC generates OpenAPI, not AsyncAPI.
- **Make cursors strings in the contract:** with a numeric `next_cursor`, the CLI's `--page-all` stopped after page one.
- **Real-time, verified live (`mise run api:live-test`, 5/5):** `NotesHub` is **oRPC's `DurablePublisherObject`** (`@orpc/cloudflare`; subscribers are hibernatable WebSockets). `notes.create` publishes each note.
  - **SSE:** `notes.watch` is a `publisher.subscribe()` loop. It reaches the Go SDK (`Watch`), the TypeScript SDK (`notes.watch()`) and the CLI (`notes watch`).
  - **Resume:** the publisher keeps 60 s of events, so a client reconnecting with `Last-Event-ID` gets the notes it missed (verified). That covers a redeploy restarting the DO.
  - **WebSockets:** `/api/notes/live` is held by the Worker, which forwards published notes as plain JSON. The publisher's own socket protocol is oRPC's, and Fern's TypeScript client needs plain messages. Only the TypeScript SDK gets a client (`liveNotes.connect()`).
  - **OpenAPI version:** 2.0 defaults to 3.2.0, which `fern check` rejects, so `spec.ts` and the Worker ask for 3.1.1.
- **Where output goes:** here, `sdk/out/` (gitignored). For real use, SDKs ship as packages or repos (npm, a Go module repo, CLI releases). Fern's `output: location: github` can write to those repos.

Everything runs through mise from the repo root:

```sh
mise run sdk:doctor                     # check the setup
mise run sdk:install                    # Fern (fern-api) + TypeScript toolchain into sdk/node_modules
mise run sdk:list                       # APIs and their groups
mise run sdk:check-spec petstore        # fern check
mise run sdk:gen petstore go            # fern generate --local -> out/petstore/go
mise run sdk:check sdk/out/petstore/go   # Go: build + vet + tests on WireMock; TS: typecheck
mise run sdk:demo                       # Go + TypeScript for petstore, checked
mise run sdk:docs                       # API docs site for all APIs: http://localhost:3030 (fern docs dev)
mise run sdk:clean                      # remove out/, stop leftover containers
```

**To add an API,** copy `fern/apis/petstore/` to a new folder, replace `openapi.json`, and adjust `generators.yml`. That covers output paths, the Go module and each generator's options. The options for each language are documented at `buildwithfern.com/learn/sdks/generators/<lang>/configuration`. Here we use:

- `namespaceExport`, which names the TypeScript client (e.g. `PetstoreClient`);
- `module` and `packageName` for Go.

Good to know:

- **Versions:** the generators are pinned to the versions Cloudflare uses in Forge. Newer versions exist.
- **`sdk:cloudflare` is heavy.** It downloads Cloudflare's 26 MB spec and slices the chosen products into `fern/apis/cloudflare/`.
- **Licensing:** Fern's docs call local generation an Enterprise feature that needs a `FERN_TOKEN`. It has run here without one.
