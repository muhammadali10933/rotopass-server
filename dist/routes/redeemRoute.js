"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const authMiddleware_1 = __importDefault(require("../lib/authMiddleware"));
const redeem_controller_1 = require("../controllers/redeem_controller");
const redeemRoute = express_1.default.Router();
redeemRoute.get("/peacock/my-code", authMiddleware_1.default, redeem_controller_1.getPeacockCode);
redeemRoute.post("/promo/fantasylife", authMiddleware_1.default, redeem_controller_1.getFantasyLifeCode);
exports.default = redeemRoute;
