import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { decrypt } from "../lib/encryption";
import { AuthRequest } from "../lib/authMiddleware";
import axios from "axios";

const prisma = new PrismaClient();

// GET /peacock/my-code
export const getPeacockCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // ✅ Check for active subscription via Purchase table
        const activePurchase = await prisma.purchase.findFirst({
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
        let codeEntry = await prisma.peacockCode.findUnique({
            where: { userId },
        });

        // ✅ If not, assign the next available one
        if (!codeEntry) {
            const nextAvailable = await prisma.peacockCode.findFirst({
                where: { userId: null },
                orderBy: { createdAt: "asc" },
            });

            if (!nextAvailable) {
                res.status(404).json({ error: "No codes available." });
                return;
            }

            codeEntry = await prisma.peacockCode.update({
                where: { id: nextAvailable.id },
                data: {
                    userId,
                    dateRedeem: new Date(),
                },
            });
        }

        const decrypted = decrypt(codeEntry.voucherCode);
        res.status(200).json({ code: decrypted });
    } catch (err) {
        console.error("Error retrieving Peacock code:", err);
        res.status(500).json({ error: "Internal error retrieving Peacock code." });
    }
};

// POST /promo/fantasylife
export const getFantasyLifeCode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }

        // ✅ Check if already has one
        const existing = await prisma.promoCode.findUnique({ where: { userId } });
        if (existing) {
            res.status(200).json({
                code: existing.code,
                url: `https://www.fantasylife.com/redeem/code=${existing.code}`,
            });
            return;
        }

        // ✅ Call FantasyLife API
        const flRes = await axios.get(
            `https://api.fantasylife.com/api/merchant/redeem/generate`,
            { params: { apikey: process.env.FANTASYLIFE_API_KEY } }
        );

        const code = flRes?.data?.code;
        if (!code) {
            res.status(502).json({ error: "FantasyLife did not return a code." });
            return;
        }

        await prisma.promoCode.create({
            data: {
                userId,
                code,
            },
        });

        res.status(200).json({
            code,
            url: `https://www.fantasylife.com/redeem/code=${code}`,
        });
    } catch (error) {
        console.error("Error retrieving FantasyLife code:", error);
        res.status(500).json({ error: "Failed to retrieve FantasyLife code." });
    }
};
