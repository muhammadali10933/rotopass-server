"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFantasyLifeCode = exports.getPeacockCode = void 0;
const client_1 = require("@prisma/client");
const encryption_1 = require("../lib/encryption");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
// GET /peacock/my-code
const getPeacockCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // ✅ Check for active subscription via Purchase table
        const activePurchase = yield prisma.purchase.findFirst({
            where: {
                owner_id: userId,
                deleted_on: null,
            },
        });
        if (!activePurchase) {
            res.status(403).json({
                error: "You must be an active RotoPass subscriber to claim this code.",
            });
            return;
        }
        // ✅ Check if user already has a PeacockCode
        let codeEntry = yield prisma.peacockCode.findUnique({
            where: { userId },
        });
        // ✅ If not, assign the next available one
        if (!codeEntry) {
            const nextAvailable = yield prisma.peacockCode.findFirst({
                where: { userId: null },
                orderBy: { createdAt: "asc" },
            });
            if (!nextAvailable) {
                res.status(404).json({ error: "No codes available." });
                return;
            }
            codeEntry = yield prisma.peacockCode.update({
                where: { id: nextAvailable.id },
                data: {
                    userId,
                    dateRedeem: new Date(),
                },
            });
        }
        const decrypted = (0, encryption_1.decrypt)(codeEntry.voucherCode);
        res.status(200).json({ code: decrypted });
    }
    catch (err) {
        console.error("Error retrieving Peacock code:", err);
        res.status(500).json({ error: "Internal error retrieving Peacock code." });
    }
});
exports.getPeacockCode = getPeacockCode;
// POST /promo/fantasylife
const getFantasyLifeCode = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // ✅ Check if already has one
        const existing = yield prisma.promoCode.findUnique({ where: { userId } });
        if (existing) {
            res.status(200).json({
                code: existing.code,
                url: `https://www.fantasylife.com/redeem/code=${existing.code}`,
            });
            return;
        }
        // ✅ Call FantasyLife API
        const flRes = yield axios_1.default.get(`https://api.fantasylife.com/api/merchant/redeem/generate`, { params: { apikey: process.env.FANTASYLIFE_API_KEY } });
        const code = (_b = flRes === null || flRes === void 0 ? void 0 : flRes.data) === null || _b === void 0 ? void 0 : _b.code;
        if (!code) {
            res.status(502).json({ error: "FantasyLife did not return a code." });
            return;
        }
        yield prisma.promoCode.create({
            data: {
                userId,
                code,
            },
        });
        res.status(200).json({
            code,
            url: `https://www.fantasylife.com/redeem/code=${code}`,
        });
    }
    catch (error) {
        console.error("Error retrieving FantasyLife code:", error);
        res.status(500).json({ error: "Failed to retrieve FantasyLife code." });
    }
});
exports.getFantasyLifeCode = getFantasyLifeCode;
