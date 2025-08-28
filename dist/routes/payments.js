"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const payments_controller_1 = __importDefault(require("../controllers/payments_controller"));
const authMiddleware_1 = __importDefault(require("../lib/authMiddleware"));
const paymentsRoute = express_1.default.Router();
paymentsRoute.get("/client-token", authMiddleware_1.default, payments_controller_1.default.createClientTokenController);
paymentsRoute.post("/checkout", authMiddleware_1.default, payments_controller_1.default.checkoutController);
exports.default = paymentsRoute;
