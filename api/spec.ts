// Writes the API's OpenAPI spec from the contract, offline (no Worker needed), for Fern:
//   node spec.ts <out.json> [server-url]
// The same generator the Worker serves /api/openapi.json with.
import { writeFileSync } from "node:fs";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import { contract, info } from "./src/contract.ts";

// OPENAPI_VERSION: 2.0 generates 3.2.0 by default; 3.1.1 is what 1.x produced and what Fern reads today.
const version = (process.env.OPENAPI_VERSION ?? "3.1.1") as "3.1.1";
const [out, server = "https://api.example.com"] = process.argv.slice(2);
const spec = await new OpenAPIGenerator({ converters: [new ZodToJsonSchemaConverter()] }).generate(contract, { version, base: { info, servers: [{ url: server }] } });
writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
console.log(`${out}: ${Object.keys(spec.paths ?? {}).length} paths (${server})`);
