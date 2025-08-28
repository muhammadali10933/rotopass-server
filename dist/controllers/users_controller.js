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
const client_1 = require("@prisma/client");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const mailer_1 = require("../lib/mailer");
const utils_1 = require("../lib/utils");
const prisma = new client_1.PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key"; // Use a secure secret key in production
const userController = {
    registerUserController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { firstName, lastName, email, password } = req.body;
        try {
            // Check if user already exists
            const existingUser = yield prisma.user.findUnique({
                where: { email },
            });
            if (existingUser) {
                res.status(400).json({ error: "User already exists" });
                return;
            }
            const hashedPassword = bcrypt_1.default.hashSync(password, 10); // Hash password
            // Create new user
            const newUser = yield prisma.user.create({
                data: {
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    status: 0,
                },
            });
            // Save password into UserPassword table
            yield prisma.userPassword.create({
                data: {
                    user_id: newUser.id,
                    password: hashedPassword,
                },
            });
            const token = jsonwebtoken_1.default.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
            res.status(201).json({ error: null, token });
        }
        catch (error) {
            console.error("Error registering user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
    loginUserController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, password } = req.body;
        try {
            const user = yield prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                res.status(400).json({ error: "Incorrect Username or Password" });
                return;
            }
            const userPasswordRecord = yield prisma.userPassword.findUnique({
                where: { user_id: user.id },
            });
            const isPasswordValid = userPasswordRecord && bcrypt_1.default.compareSync(password, userPasswordRecord.password);
            if (!isPasswordValid) {
                res.status(400).json({ error: "Incorrect Username or Password" });
                return;
            }
            const token = jsonwebtoken_1.default.sign({ id: user.id, email: user.email }, JWT_SECRET);
            const latestPurchase = yield prisma.purchase.findFirst({
                where: { owner_id: user.id },
                orderBy: { created_on: "desc" },
            });
            if (!latestPurchase) {
                res.json({ expired: null, error: null, token });
                return;
            }
            const purchaseDate = new Date(latestPurchase.created_on);
            const oneYearLater = new Date(purchaseDate);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const isExpired = new Date() > oneYearLater;
            res.status(200).json({
                expired: isExpired,
                error: null,
                token,
                expiredDate: oneYearLater,
            });
        }
        catch (error) {
            console.error("Error logging in user:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
    checkExpiresController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { id } = req.body;
        if (!id) {
            res.status(400).json({ error: "No userID requested" });
            return;
        }
        try {
            const latestPurchase = yield prisma.purchase.findFirst({
                where: { owner_id: id },
                orderBy: { created_on: "desc" },
            });
            if (!latestPurchase) {
                res.json({ expired: null });
                return;
            }
            const purchaseDate = new Date(latestPurchase.created_on);
            const oneYearLater = new Date(purchaseDate);
            oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
            const isExpired = new Date() > oneYearLater;
            res.json({ expired: isExpired, expiredDate: oneYearLater });
        }
        catch (error) {
            console.error("Error checking expiration:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
    forgotPasswordController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email } = req.body;
        try {
            const user = yield prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                res.status(400).json({ error: "User not found" });
                return;
            }
            const resetToken = jsonwebtoken_1.default.sign({ email }, JWT_SECRET, { expiresIn: "1h" });
            const templateData = {
                email,
                resetLink: `${process.env.FRONTEND_URL}/reset?token=${resetToken}`,
                subject: "Reset Password Instructions",
                time: (0, utils_1.getTimeInEDT)(),
            };
            yield (0, mailer_1.sendResetEmail)(email, "reset-password.html", templateData);
            res.status(200).json({
                message: "Check your email for instructions on how to reset your password.",
            });
        }
        catch (error) {
            console.error("Error in forgot password:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
    resetPasswordController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        const { email, password } = req.body;
        try {
            const user = yield prisma.user.findUnique({
                where: { email },
            });
            if (!user) {
                res.status(400).json({ error: "User not found" });
                return;
            }
            const hashedPassword = bcrypt_1.default.hashSync(password, 10);
            const userPasswordRecord = yield prisma.userPassword.findUnique({
                where: { user_id: user.id },
            });
            if (!userPasswordRecord) {
                res.status(404).json({ error: "User password record not found" });
                return;
            }
            yield prisma.userPassword.update({
                where: { id: userPasswordRecord.id },
                data: { password: hashedPassword },
            });
            res.status(200).json({ message: "Password reset successfully" });
        }
        catch (error) {
            console.error("Error resetting password:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
    freeSignUpController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const { email } = req.body;
            if (!email) {
                res.status(400).json({ error: "Email is required" });
                return;
            }
            const response = yield fetch(`https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.BEEHIIV_API_KEY}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    email,
                    source: "website-signup",
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                }),
            });
            const responseText = yield response.text();
            console.log("Beehiiv response:", response.status, responseText);
            if (!response.ok) {
                let errorMessage = "Subscription failed";
                try {
                    const errorData = JSON.parse(responseText);
                    errorMessage = errorData.message || errorMessage;
                }
                catch (_a) {
                    // ignore parsing error
                }
                res.status(response.status).json({ error: errorMessage });
                return;
            }
            res.status(200).json({ success: true });
        }
        catch (error) {
            console.error("Error in free signup:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
};
exports.default = userController;
