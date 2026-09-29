import { DurableObject, WorkflowEntrypoint, env } from "cloudflare:workers";
import type { WorkflowEvent, WorkflowStep } from "cloudflare:workers";

export class MyFlow extends WorkflowEntrypoint<Env, { name: string }> {
	async run(event: WorkflowEvent<{ name: string }>, step: WorkflowStep) {
		const a = await step.do("greet", async () => `hello ${event.payload.name}`);
		await step.sleep("nap", "1 second");
		const b = await step.do("shout", async () => a.toUpperCase());
		return { result: b };
	}
}

export class Counter extends DurableObject {
	async increment(): Promise<number> {
		this.ctx.storage.sql.exec("CREATE TABLE IF NOT EXISTS c (id INTEGER PRIMARY KEY, n INTEGER)");
		this.ctx.storage.sql.exec("INSERT INTO c (id, n) VALUES (1, 1) ON CONFLICT(id) DO UPDATE SET n = n + 1");
		return this.ctx.storage.sql.exec<{ n: number }>("SELECT n FROM c WHERE id = 1").one().n;
	}
}

export async function handleApi(request: Request, ctx: ExecutionContext): Promise<Response | null> {
	const url = new URL(request.url);
	switch (url.pathname) {
		case "/api/hello":
			return new Response(`Hello from ${env.APP_NAME}`);
		case "/api/do":
			return Response.json({ n: await ctx.exports.Counter.getByName("global").increment() });
		case "/api/kv": {
			const n = Number((await env.KV.get("hits")) ?? 0) + 1;
			await env.KV.put("hits", String(n));
			return Response.json({ n });
		}
		case "/api/d1": {
			await env.DB.prepare("INSERT INTO notes (body) VALUES (?)").bind(url.searchParams.get("b") ?? "x").run();
			const r = await env.DB.prepare("SELECT count(*) AS n FROM notes").first<{ n: number }>();
			return Response.json(r);
		}
		case "/api/r2": {
			await env.BUCKET.put("hello.txt", `r2 at ${new Date().toISOString()}`);
			return new Response((await env.BUCKET.get("hello.txt"))!.body);
		}
		case "/api/queue": {
			const body = { msg: url.searchParams.get("m") ?? "hi", at: new Date().toISOString() };
			await env.Q.send(body);
			return Response.json({ sent: body });
		}
		case "/api/queue/last":
			return new Response((await env.KV.get("last-queue")) ?? "none");
		case "/api/cron/last":
			return new Response((await env.KV.get("last-cron")) ?? "none");
		case "/api/wf/start": {
			const inst = await env.FLOW.create({ params: { name: url.searchParams.get("n") ?? "wf" } });
			return Response.json({ id: inst.id });
		}
		case "/api/wf/status":
			return Response.json(await (await env.FLOW.get(url.searchParams.get("id")!)).status());
		case "/api/ai":
			return Response.json(
				await env.AI.run("@cf/meta/llama-3.2-1b-instruct", {
					messages: [{ role: "user", content: "Reply with exactly one word: pong" }],
					max_tokens: 10,
				}),
			);
	}
	return null;
}

export default {
	async fetch(request, _env, ctx) {
		return (await handleApi(request, ctx)) ?? new Response("not found", { status: 404 });
	},
	async scheduled(controller) {
		await env.KV.put("last-cron", JSON.stringify({ cron: controller.cron, at: new Date(controller.scheduledTime).toISOString() }));
	},
	async queue(batch) {
		for (const m of batch.messages) {
			await env.KV.put("last-queue", JSON.stringify(m.body));
			m.ack();
		}
	},
} satisfies ExportedHandler<Env, { msg: string; at: string }>;
