import { SELF, env } from "cloudflare:test";
import { beforeAll, expect, it } from "vitest";
import init from "../migrations/0001_init.sql?raw";

// The test database starts empty: apply the migration first.
beforeAll(async () => {
	await env.DB.exec(init.replace(/\n/g, " "));
});

it("says hello", async () => {
	const response = await SELF.fetch("http://x/api/hello");
	expect(await response.text()).toBe("Hello from __NAME__");
});

it("counts hits in KV", async () => {
	const a = await (await SELF.fetch("http://x/api/hits", { method: "POST" })).json<{ hits: number }>();
	const b = await (await SELF.fetch("http://x/api/hits", { method: "POST" })).json<{ hits: number }>();
	expect(b.hits).toBe(a.hits + 1);
});

it("stores notes in D1", async () => {
	const created = await SELF.fetch("http://x/api/notes", { method: "POST", body: "first" });
	expect(created.status).toBe(201);
	const notes = await (await SELF.fetch("http://x/api/notes")).json<{ body: string }[]>();
	expect(notes.map(n => n.body)).toContain("first");
});

it("rejects an empty note", async () => {
	expect((await SELF.fetch("http://x/api/notes", { method: "POST", body: " " })).status).toBe(400);
});
