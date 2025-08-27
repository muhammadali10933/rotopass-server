import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { gateway } from "../lib/braintree";
import { AuthRequest } from "../lib/authMiddleware";

const prisma = new PrismaClient();

const paymentsController = {
  createClientTokenController: async (
    req: Request,
    res: Response
  ): Promise<void> => {
    const response = await gateway.clientToken.generate({});
    res.send({
      clientToken: response.clientToken,
      error: null,
    });
  },
  checkoutController: async (
    req: AuthRequest,
    res: Response
  ): Promise<void> => {
    const { nonce } = req.body;
    const { user } = req;
    if (!nonce) {
      res.status(400).json({ error: "Payment nonce is required" });
      return;
    }

    try {
      let customer = null;
      const subscriptionRecord = await prisma.purchase.findFirst({
        where: {
          owner_id: user.id,
        },
      });
      if (subscriptionRecord?.billable_id) {
        const subscription = await gateway.subscription.find(
          subscriptionRecord?.billable_id
        );
        const customerId =
          subscription.transactions && subscription.transactions.length > 0
            ? subscription.transactions[0]?.customer.id
            : undefined;
        if (!customerId) {
          throw new Error("Customer ID not found in subscription transactions");
        }
        customer = await gateway.customer.find(customerId);
      } else {
        const customerResult = await gateway.customer.create({
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          paymentMethodNonce: nonce,
        });
        if (!customerResult.success) {
          res.status(400).json({ error: customerResult.message });
          return;
        }
        customer = customerResult.customer;
      }

      // At this point, customer is either from .find or a successful .create response

      const result = await gateway.subscription.create({
        paymentMethodToken:
          customer.paymentMethods && customer.paymentMethods.length > 0
            ? customer.paymentMethods[0].token
            : (() => {
                throw new Error("No payment methods found for customer");
              })(),
        planId: "annual", // Replace with your actual plan ID
        options: {
          startImmediately: true, // Start the subscription immediately
        },
        price: "99.99", // Replace with the actual amount
      });

      if (result.success) {
        const newPurchase = await prisma.purchase.create({
          data: {
            price_id: 1,
            owner_id: user.id,
            amount: parseFloat(result.subscription.price || "99.99"),
            billable_type: "merchant.braintree.subscription",
            billable_id: result.subscription.id,
            deleted_on: null, // Set to null if it's optional
          },
        });
        const purchaseDate = new Date(newPurchase.created_on);
        const oneYearLater = new Date(purchaseDate);
        oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
        res.status(200).json({
          message: "Transaction successful",
          result,
          expired: false,
          expiredDate: oneYearLater,
        });
      } else {
        res.status(400).json({ error: result.message });
      }
    } catch (error) {
      console.error("Error processing transaction:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default paymentsController;
