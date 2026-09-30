"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookQueryParameter = getWebhookQueryParameter;
/**
 * Read a single query parameter value from a URL without mutating or reordering it.
 * Used to extract a transmitted body hash (e.g. Twilio's bodySHA256) from the
 * notification URL. Returns undefined when the URL is unparseable or the parameter
 * is absent.
 */
function getWebhookQueryParameter(url, name) {
    var _a;
    try {
        return (_a = new URL(url).searchParams.get(name)) !== null && _a !== void 0 ? _a : undefined;
    }
    catch (_b) {
        return undefined;
    }
}
