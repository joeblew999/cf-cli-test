import { SELF, env } from "cloudflare:test";
import { expect, it } from "vitest";

it("serves /api/hello", async () => {
	const r = await SELF.fetch("http://x/api/hello");
	expect(await r.text()).toBe("Hello from __NAME__");
});

it("counts in the Durable Object", async () => {
	const a = await (await SELF.fetch("http://x/api/do")).json<{ n: number }>();
	const b = await (await SELF.fetch("http://x/api/do")).json<{ n: number }>();
	expect(b.n).toBe(a.n + 1);
});

it("has KV", async () => {
	await env.KV.put("last-cron", "x");
	expect(await env.KV.get("last-cron")).toBe("x");
});
