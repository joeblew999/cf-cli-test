import { env } from "cloudflare:workers";
import { OpenAPIGenerator } from "@orpc/openapi";
import { OpenAPIHandler } from "@orpc/openapi/fetch";
import { DurablePublisher } from "@orpc/cloudflare";
import { implement } from "@orpc/server";
import { ZodToJsonSchemaConverter } from "@orpc/zod";
import type { z } from "zod";
import { contract, info, type note } from "./contract.ts";
export { NotesHub } from "./hub.ts";

type Note = z.infer<typeof note>;

// New notes go through oRPC's publisher on the NotesHub Durable Object; SSE and WebSocket clients
// both subscribe to it.
const publisher = () => new DurablePublisher<{ note: Note }>(env.HUB);

// The contract (src/contract.ts) implemented on D1, served by oRPC's OpenAPIHandler as plain REST.
const api = implement(contract);

export const router = api.router({
	hello: api.hello.handler(() => ({ message: `Hello from ${env.APP_NAME}` })),
	notes: {
		list: api.notes.list.handler(async ({ input }) => {
			// Cursors are opaque strings to callers (here, the last id seen).
			const cursor = input.cursor ? Number(input.cursor) : Number.MAX_SAFE_INTEGER;
			const { results } = await env.DB.prepare("SELECT id, body, created_at FROM notes WHERE id < ? ORDER BY id DESC LIMIT ?")
				.bind(cursor, input.limit + 1)
				.all<Note>();
			const page = results.slice(0, input.limit);
			return { data: page, next_cursor: results.length > input.limit ? String(page.at(-1)!.id) : undefined };
		}),
		// SSE: new notes as they are published. lastEventId (the SSE Last-Event-ID header) replays what
		// a reconnecting client missed.
		watch: api.notes.watch.handler(async function* ({ input, signal, lastEventId }) {
			const until = AbortSignal.any([AbortSignal.timeout(input.seconds * 1000), ...(signal ? [signal] : [])]);
			try {
				for await (const note of publisher().subscribe("note", { signal: until, lastEventId })) yield note;
			} catch (error) {
				if (!until.aborted) throw error;
			}
		}),
		create: api.notes.create.handler(async ({ input }) => {
			const note = await env.DB.prepare("INSERT INTO notes (body) VALUES (?) RETURNING id, body, created_at").bind(input.body).first<Note>();
			await publisher().publish("note", note!);
			return note!;
		}),
	},
});

const handler = new OpenAPIHandler(router);

// WebSocket clients (the channel in sdk/fern/apis/api/asyncapi.yml) get plain JSON notes, so the Worker
// holds the socket and forwards what the publisher delivers.
async function live(request: Request): Promise<Response> {
	if (request.headers.get("upgrade") !== "websocket") return new Response("expected a WebSocket upgrade", { status: 426 });
	const [client, server] = Object.values(new WebSocketPair());
	server.accept();
	const unsubscribe = await publisher().subscribe("note", note => server.send(JSON.stringify(note)));
	server.addEventListener("close", () => void unsubscribe());
	return new Response(null, { status: 101, webSocket: client });
}

export default {
	async fetch(request) {
		const url = new URL(request.url);
		// The spec, generated from the same router: what sdk/fern/apis/api/openapi.json is made from.
		if (url.pathname === "/api/openapi.json") {
			const spec = await new OpenAPIGenerator({ converters: [new ZodToJsonSchemaConverter()] }).generate(router, { version: "3.1.1", base: { info, servers: [{ url: url.origin }] } });
			return Response.json(spec);
		}
		if (url.pathname === "/api/notes/live") return live(request);
		const { matched, response } = await handler.handle(request, { context: {} });
		return matched ? response : new Response("not found", { status: 404 });
	},
} satisfies ExportedHandler;
