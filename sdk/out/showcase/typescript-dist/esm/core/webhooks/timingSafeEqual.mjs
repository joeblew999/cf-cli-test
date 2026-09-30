var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { RUNTIME } from "../runtime/index.mjs";
export function timingSafeEqual(a, b) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        if (RUNTIME.type === "node") {
            const crypto = yield import("crypto");
            const bufA = Buffer.from(a);
            const bufB = Buffer.from(b);
            if (bufA.length !== bufB.length) {
                // Still perform comparison to avoid leaking length via timing
                const dummy = Buffer.alloc(bufA.length);
                crypto.timingSafeEqual(bufA, dummy);
                return false;
            }
            return crypto.timingSafeEqual(bufA, bufB);
        }
        // Fallback: constant-time XOR comparison using Uint8Array
        const enc = new TextEncoder();
        const bytesA = enc.encode(a);
        const bytesB = enc.encode(b);
        if (bytesA.length !== bytesB.length) {
            // XOR each byte of bytesA against bytesB[0] (a runtime value) so the
            // loop cannot be trivially folded to a constant by the engine. This is
            // best-effort timing-stability: JS has no guarantee, but we avoid an
            // obvious early-exit that would trivially leak length via timing.
            const pivot = (_a = bytesB[0]) !== null && _a !== void 0 ? _a : 0;
            let sink = 0;
            for (let i = 0; i < bytesA.length; i++) {
                sink |= bytesA[i] ^ pivot;
            }
            void sink;
            return false;
        }
        let result = 0;
        for (let i = 0; i < bytesA.length; i++) {
            result |= bytesA[i] ^ bytesB[i];
        }
        return result === 0;
    });
}
