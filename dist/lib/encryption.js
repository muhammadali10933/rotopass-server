"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = "aes-256-cbc";
const KEY = Buffer.from(process.env.ENCRYPTION_KEY, "hex"); // 32 bytes
const IV = Buffer.from(process.env.ENCRYPTION_IV, "hex"); // 16 bytes
function encrypt(text) {
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, KEY, IV);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
}
function decrypt(encrypted) {
    const decipher = crypto_1.default.createDecipheriv(ALGORITHM, KEY, IV);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
}
