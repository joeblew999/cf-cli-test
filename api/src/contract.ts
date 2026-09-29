import { eventIterator, oc } from "@orpc/contract";
import { z } from "zod";

// The API, contract first: every route with its method, path, input and output as Zod 4 schemas.
// The Worker implements it (src/index.ts) and the OpenAPI spec is generated from it (spec.ts ->
// sdk/fern/apis/api/openapi.json), from which Fern makes SDKs, a CLI and docs. Everything the SDKs
// need is said here too: operationId/tags name the SDK methods, and `spec` adds Fern's extensions
// (x-fern-*) to the generated operation, so nothing is patched afterwards.

export const info = { title: "cftest-api", version: "1.0.0", description: "Notes API: oRPC contract -> OpenAPI -> Fern." };

export const note = z.object({
	id: z.number().int(),
	body: z.string(),
	created_at: z.string(),
});

/** Fern's names for the SDK method: client.<group>.<method>() and `cli <group> <method>`. */
const sdk = (group: string, method: string, extra: Record<string, unknown> = {}) =>
	<T extends object>(op: T): T => ({ ...op, "x-fern-sdk-group-name": group, "x-fern-sdk-method-name": method, ...extra });

export const contract = {
	hello: oc
		.route({ method: "GET", path: "/api/hello", summary: "Say hello", tags: ["meta"], operationId: "hello", spec: sdk("meta", "hello") })
		.output(z.object({ message: z.string() })),
	notes: {
		list: oc
			.route({
				method: "GET", path: "/api/notes", summary: "List notes, newest first (cursor pagination)", tags: ["notes"], operationId: "listNotes",
				spec: sdk("notes", "list", { "x-fern-pagination": { cursor: "$request.cursor", next_cursor: "$response.next_cursor", results: "$response.data" } }),
			})
			.input(z.object({
				// Opaque string cursors: the generated CLI's --page-all stops on numeric ones.
				cursor: z.string().optional().describe("Opaque cursor from the previous page's next_cursor"),
				limit: z.coerce.number().int().min(1).max(100).default(20),
			}))
			.output(z.object({ data: z.array(note), next_cursor: z.string().optional().describe("Pass as cursor for the next page; absent on the last page") })),
		watch: oc
			.route({
				method: "GET", path: "/api/notes/watch", summary: "Stream new notes as they are created (Server-Sent Events)", tags: ["notes"], operationId: "watchNotes",
				// oRPC describes the stream as its SSE envelope (event: message|done|error); tell Fern it's
				// an SSE stream whose `data:` payloads are notes.
				spec: op => {
					const ok = (op.responses as any)?.["200"];
					if (ok?.content?.["text/event-stream"]) ok.content["text/event-stream"].schema = z.toJSONSchema(note);
					return sdk("notes", "watch", { "x-fern-streaming": { format: "sse" } })(op);
				},
			})
			.input(z.object({ seconds: z.coerce.number().int().min(1).max(300).default(30).describe("How long to keep the stream open") }))
			.output(eventIterator(note)),
		create: oc
			.route({ method: "POST", path: "/api/notes", summary: "Create a note", tags: ["notes"], operationId: "createNote", spec: sdk("notes", "create") })
			.input(z.object({ body: z.string().min(1) }))
			.output(note),
	},
};
