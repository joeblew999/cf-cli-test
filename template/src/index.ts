import { env } from "cloudflare:workers";

// Everything under /api/* runs here; every other path is served from public/ (SPA fallback).
export default {
	async fetch(request) {
		const url = new URL(request.url);
		switch (`${request.method} ${url.pathname}`) {
			case "GET /api/hello":
				return new Response(`Hello from ${env.APP_NAME}`);
			case "POST /api/hits": {
				const hits = Number((await env.KV.get("hits")) ?? 0) + 1;
				await env.KV.put("hits", String(hits));
				return Response.json({ hits });
			}
			case "GET /api/notes": {
				const { results } = await env.DB.prepare("SELECT id, body, created_at FROM notes ORDER BY id DESC LIMIT 50").all();
				return Response.json(results);
			}
			case "POST /api/notes": {
				const body = (await request.text()).trim();
				if (!body) return new Response("empty note", { status: 400 });
				const note = await env.DB.prepare("INSERT INTO notes (body) VALUES (?) RETURNING id, body, created_at").bind(body).first();
				return Response.json(note, { status: 201 });
			}
		}
		return new Response("not found", { status: 404 });
	},
} satisfies ExportedHandler;
