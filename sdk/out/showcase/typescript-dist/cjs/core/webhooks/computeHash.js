"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HASH_ALGORITHM_TO_SUBTLE_NAME = void 0;
exports.computeHash = computeHash;
const index_js_1 = require("../runtime/index.js");
exports.HASH_ALGORITHM_TO_SUBTLE_NAME = {
    sha1: "SHA-1",
    sha256: "SHA-256",
    sha384: "SHA-384",
    sha512: "SHA-512",
};
/**
 * Compute a digest of the raw request body. Unlike computeHmacSignature this is an
 * unkeyed hash, used by providers that transmit a hash of the raw body separately
 * (e.g. Twilio's bodySHA256 query parameter) rather than signing the body directly.
 */
function computeHash(args) {
    return __awaiter(this, void 0, void 0, function* () {
        if (index_js_1.RUNTIME.type === "node") {
            const crypto = yield Promise.resolve().then(() => __importStar(require("crypto")));
            const hash = crypto.createHash(args.algorithm);
            hash.update(args.payload);
            return hash.digest(args.encoding);
        }
        const subtle = globalThis.crypto.subtle;
        const enc = new TextEncoder();
        const digest = yield subtle.digest(exports.HASH_ALGORITHM_TO_SUBTLE_NAME[args.algorithm], enc.encode(args.payload));
        const bytes = new Uint8Array(digest);
        if (args.encoding === "hex") {
            return Array.from(bytes)
                .map((b) => b.toString(16).padStart(2, "0"))
                .join("");
        }
        // base64
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    });
}
