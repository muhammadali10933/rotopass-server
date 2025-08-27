import express from "express";
import authMiddleware from "../lib/authMiddleware";
import { getPeacockCode, getFantasyLifeCode } from "../controllers/redeem_controller";

const redeemRoute = express.Router();

redeemRoute.get("/peacock/my-code", authMiddleware, getPeacockCode);
redeemRoute.post("/promo/fantasylife", authMiddleware, getFantasyLifeCode);

export default redeemRoute;