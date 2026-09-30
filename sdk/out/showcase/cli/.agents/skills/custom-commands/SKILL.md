---
name: showcase-custom-commands
description: How to author custom commands for the showcase CLI using the co-generated SDK.
---

# Custom Commands for `showcase`

## Overview

The `showcase` CLI supports user-authored custom commands that are
compiled into the binary alongside the auto-generated API commands.
Custom commands get a fully-wired SDK client that inherits the CLI's
auth, retries, TLS, base URL, and global headers — zero configuration required.

## Architecture

```
cli/showcase/custom.rs    ← Your command handlers (protected by .fernignore)
cli/showcase/sdk.rs       ← Generated bridge: client() + block_on()
cli/showcase/main.rs      ← Generated entrypoint (calls custom::register)
showcase-sdk/             ← Co-generated typed SDK crate
showcase-types/           ← Co-generated typed model crate
```

## Adding a Custom Command

### 1. Edit `cli/showcase/custom.rs`

This file is protected by `.fernignore` — `fern generate` will never
overwrite it. Register commands in the `register()` function:

```rust
use showcase_sdk::api::*;

pub fn register(app: CliApp) -> CliApp {
    let app = app.command(
        clap::Command::new("list")
            .about("List notes (cursor pagination)")
        ,
        |matches, ctx| {
            let client = super::sdk::client(ctx);
            let result = super::sdk::block_on(
                client.notes.list(),
            )?;
            println!("{}", serde_json::to_string_pretty(&result).unwrap());
            Ok(())
        },
    );
    app
}
```

Then build and test:
```bash
cargo build
showcase list
```

### 2. Available SDK Clients

The `super::sdk::client(ctx)` call returns a `showcase_sdk::api::Client`
with the following sub-clients:

| Field | Type | Description |
|-------|------|-------------|
| `client.auth` | `showcase_sdk::api::AuthClient` | auth operations |
| `client.notes` | `showcase_sdk::api::NotesClient` | notes operations |
| `client.files` | `showcase_sdk::api::FilesClient` | files operations |

### 3. Key Patterns

**Get the SDK client** (execution-sharing, fully authenticated):
```rust
let client = super::sdk::client(ctx);
```

**Run an async SDK call from a sync handler:**
```rust
let result = super::sdk::block_on(
    client.some_resource.some_method(args),
)?;
```

**Use typed models for request/response serialization:**
```rust
use showcase_sdk::api::*;
```

### 4. Authentication

Custom commands automatically inherit the CLI's authentication.
The following auth schemes are configured:

- **OAuth** (oauth-client-credentials): env `SHOWCASE_CLIENT_ID`, `SHOWCASE_CLIENT_SECRET`

No manual auth wiring is needed in custom command handlers.

## Regeneration Safety

| File | Regenerated? | Notes |
|------|-------------|-------|
| `cli/showcase/custom.rs` | **No** | Protected by `.fernignore` |
| `cli/showcase/sdk.rs` | Yes | Bridges AppContext → SDK client |
| `cli/showcase/main.rs` | Yes | Calls `custom::register(app)` |
| `showcase-sdk/` | Yes | Co-generated typed SDK crate |
| `showcase-types/` | Yes | Co-generated typed models |

After running `fern generate`, your `custom.rs` is preserved. All
generated code (SDK, types, glue, main.rs) is updated to match the
latest API spec. If the SDK surface changes (renamed methods, new
sub-clients), update your `custom.rs` to match.

## Build & Test

```bash
# Build the CLI (includes custom commands)
cargo build

# Run your custom command
showcase <your-command> [args]

# Run with verbose output for debugging
RUST_LOG=debug showcase <your-command> [args]
```
