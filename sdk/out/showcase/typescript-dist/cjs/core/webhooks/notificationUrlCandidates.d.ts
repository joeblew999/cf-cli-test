export interface NotificationUrlCandidatesOptions {
    /**
     * Try the URL both with the scheme's standard port added (`:443` for https, `:80`
     * for http) if absent, and with any port removed.
     */
    portVariants: boolean;
    /**
     * Additionally try each port variant with the query string re-encoded using legacy
     * form-encoding, reversing percent-encoding differences introduced by WHATWG URL parsing.
     */
    legacyQueryEncoding: boolean;
}
/**
 * Build the list of normalized notification-URL forms to verify a webhook signature
 * against. Some providers (e.g. Twilio) are inconsistent about whether the URL they
 * signed carried a port and how its query string was encoded, so a signature is
 * accepted if it matches the computation over ANY of these candidates.
 *
 * Mirrors twilio-node's `addPort` / `removePort` / `buildUrlWithStandardPort` /
 * `withLegacyQuerystring`. Always includes at least the caller-supplied URL and never
 * throws: an unparseable URL yields `[url]`.
 */
export declare function notificationUrlCandidates(url: string, options: NotificationUrlCandidatesOptions): string[];
