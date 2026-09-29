import { defineWranglerConfig } from "wrangler/experimental-config";

export default defineWranglerConfig((ctx) => {
	switch (ctx.mode) {
		case "staging": {
			return {
				types: {
					generate: false,
				},
				assetsDirectory: "./public",
			};
		}
		default: {
			return {
				types: {
					generate: false,
				},
				assetsDirectory: "./public",
			};
		}
	}
});
