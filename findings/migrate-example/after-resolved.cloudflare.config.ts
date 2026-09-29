import { bindings, defineConfig, exports, triggers } from "cf/config";

/**
 * Wrangler environments are selected through ctx.mode and the cf --mode flag.
 * @see https://developers.cloudflare.com/workers/wrangler/environments/
 */


export default defineConfig((ctx) => {
	switch (ctx.mode) {
		case "staging": {
			return {
				worker: {
					name: "cftest-legacy-staging",
					compatibilityDate: "2026-09-01",
					compatibilityFlags: [
						"nodejs_compat",
					],
					entrypoint: "src/index.ts",
					workersDev: true,
					observability: {
						enabled: true,
					},
					assets: {
						runWorkerFirst: [
							"/api/*",
						],
					},
					env: {
						GREETING: bindings.text("hello-staging"),
						APP_ENV: bindings.text("staging"),
						FEATURES: bindings.json({
							beta: true,
						}),
						DB: bindings.d1({
							name: "cftest-legacy-db",
							id: "ede76f7c-1324-4d50-a781-39a3cce7cd50",
						}),
						KV: bindings.kv({
							id: "bd30195a38fa4f1cbdf17dffa7f17f92",
						}),
						BUCKET: bindings.r2({
							name: "cftest-legacy-bucket",
						}),
						COUNTER: bindings.durableObject({
							worker: "cftest-legacy-staging",
							exportName: "Counter",
						}),
						ASSETS: bindings.assets(),
					},
					exports: {
						Counter: exports.durableObject({ storage: "sqlite" }),
					},
				},
			};
		}
		default: {
			return {
				worker: {
					name: "cftest-legacy",
					compatibilityDate: "2026-09-01",
					compatibilityFlags: [
						"nodejs_compat",
					],
					entrypoint: "src/index.ts",
					workersDev: true,
					observability: {
						enabled: true,
					},
					assets: {
						runWorkerFirst: [
							"/api/*",
						],
					},
					triggers: [
						triggers.scheduled({
							schedule: "*/30 * * * *",
						}),
					],
					env: {
						GREETING: bindings.text("hello-prod"),
						APP_ENV: bindings.text("production"),
						FEATURES: bindings.json({
							beta: false,
						}),
						DB: bindings.d1({
							name: "cftest-legacy-db",
							id: "ede76f7c-1324-4d50-a781-39a3cce7cd50",
						}),
						KV: bindings.kv({
							id: "af436682654144aa85eb7e5c60de7fae",
						}),
						BUCKET: bindings.r2({
							name: "cftest-legacy-bucket",
						}),
						COUNTER: bindings.durableObject({
							worker: "cftest-legacy",
							exportName: "Counter",
						}),
						ASSETS: bindings.assets(),
					},
					exports: {
						Counter: exports.durableObject({ storage: "sqlite" }),
					},
				},
			};
		}
	}
});
