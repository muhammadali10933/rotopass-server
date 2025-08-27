import express from "express";
import paymentsController from "../controllers/payments_controller";
import authMiddleware from "../lib/authMiddleware";
const paymentsRoute = express.Router();

paymentsRoute.get(
  "/client-token",
  authMiddleware,
  paymentsController.createClientTokenController
);

paymentsRoute.post(
  "/checkout",
  authMiddleware,
  paymentsController.checkoutController
);

export default paymentsRoute;
