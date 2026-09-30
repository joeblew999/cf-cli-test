---
name: petstore-custom-commands
description: How to author custom commands for the petstore CLI using the co-generated SDK.
---

# Custom Commands for `petstore`

## Overview

The `petstore` CLI supports user-authored custom commands that are
compiled into the binary alongside the auto-generated API commands.
Custom commands get a fully-wired SDK client that inherits the CLI's
auth, retries, TLS, base URL, and global headers — zero configuration required.

## Architecture

```
cli/petstore/custom.rs    ← Your command handlers (protected by .fernignore)
cli/petstore/sdk.rs       ← Generated bridge: client() + block_on()
cli/petstore/main.rs      ← Generated entrypoint (calls custom::register)
petstore-sdk/             ← Co-generated typed SDK crate
petstore-types/           ← Co-generated typed model crate
```

## Adding a Custom Command

### 1. Edit `cli/petstore/custom.rs`

This file is protected by `.fernignore` — `fern generate` will never
overwrite it. Register commands in the `register()` function:

```rust
use petstore_sdk::api::*;

pub fn register(app: CliApp) -> CliApp {
    let app = app.command(
        clap::Command::new("list-pets")
            .about("List pets")
        ,
        |matches, ctx| {
            let client = super::sdk::client(ctx);
            let result = super::sdk::block_on(
                client.pets.list_pets(),
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
petstore list-pets
```

### 2. Available SDK Clients

The `super::sdk::client(ctx)` call returns a `petstore_sdk::api::Client`
with the following sub-clients:

| Field | Type | Description |
|-------|------|-------------|
| `client.pets` | `petstore_sdk::api::PetsClient` | pets operations |

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
use petstore_sdk::api::*;
```

## Regeneration Safety

| File | Regenerated? | Notes |
|------|-------------|-------|
| `cli/petstore/custom.rs` | **No** | Protected by `.fernignore` |
| `cli/petstore/sdk.rs` | Yes | Bridges AppContext → SDK client |
| `cli/petstore/main.rs` | Yes | Calls `custom::register(app)` |
| `petstore-sdk/` | Yes | Co-generated typed SDK crate |
| `petstore-types/` | Yes | Co-generated typed models |

After running `fern generate`, your `custom.rs` is preserved. All
generated code (SDK, types, glue, main.rs) is updated to match the
latest API spec. If the SDK surface changes (renamed methods, new
sub-clients), update your `custom.rs` to match.

## Build & Test

```bash
# Build the CLI (includes custom commands)
cargo build

# Run your custom command
petstore <your-command> [args]

# Run with verbose output for debugging
RUST_LOG=debug petstore <your-command> [args]
```
