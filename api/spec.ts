// Writes the API's OpenAPI spec from the contract, offline (no Worker needed), for Fern:
//   node spec.ts <out.json> [server-url]
// The same generator the Worker serves /api/openapi.json with.
import { writeFileSync } from "node:fs";
import { OpenAPIGenerator } from "@orpc/openapi";
import { ZodToJsonSchemaConverter } from "@orpc/zod/zod4";
import { contract, info } from "./src/contract.ts";

const [out, server = "https://api.example.com"] = process.argv.slice(2);
const spec = await new OpenAPIGenerator({ schemaConverters: [new ZodToJsonSchemaConverter()] }).generate(contract, { info, servers: [{ url: server }] });
writeFileSync(out, JSON.stringify(spec, null, 2) + "\n");
console.log(`${out}: ${Object.keys(spec.paths ?? {}).length} paths (${server})`);
