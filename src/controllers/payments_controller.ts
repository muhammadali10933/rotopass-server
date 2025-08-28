import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import { gateway } from "../lib/braintree";
import { AuthRequest } from "../lib/authMiddleware";

const prisma = new PrismaClient();

const paymentsController = {
  createClientTokenController: async (req: Request, res: Response): Promise<void> => {
    try {
      const response = await gateway.clientToken.generate({});
      res.send({
        clientToken: response.clientToken,
        error: null,
      });
    } catch (error) {
      console.error("Error generating client token:", error);
      res.status(500).json({ error: "Failed to generate client token" });
    }
  },

  checkoutController: async (req: AuthRequest, res: Response): Promise<void> => {
    const { nonce } = req.body;
    const { user } = req;

    if (!nonce) {
      res.status(400).json({ error: "Payment nonce is required" });
      return;
    }

    try {
      let customer = null;

      // ✅ Check if user already has a purchase/subscription record
      const subscriptionRecord = await prisma.purchase.findFirst({
        where: { owner_id: user.id },
      });

      if (subscriptionRecord?.billable_id) {
        // Existing subscription → fetch from Braintree
        const subscription = await gateway.subscription.find(subscriptionRecord.billable_id);
        const customerId =
          subscription.transactions && subscription.transactions.length > 0
            ? subscription.transactions[0]?.customer.id
            : undefined;

        if (!customerId) {
          throw new Error("Customer ID not found in subscription transactions");
        }
        customer = await gateway.customer.find(customerId);
      } else {
        // New customer → create in Braintree
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

      // ✅ Create subscription in Braintree
      const result = await gateway.subscription.create({
        paymentMethodToken:
          customer.paymentMethods && customer.paymentMethods.length > 0
            ? customer.paymentMethods[0].token
            : (() => {
                throw new Error("No payment methods found for customer");
              })(),
        planId: "annual", // Replace with your actual plan ID
        options: { startImmediately: true },
        price: "99.99", // Replace with your actual amount
      });

      if (result.success) {
        // ✅ Save purchase in Postgres
        const newPurchase = await prisma.purchase.create({
          data: {
            price_id: 1,
            owner_id: user.id,
            amount: parseFloat(result.subscription.price || "99.99"),
            billable_type: "merchant.braintree.subscription",
            billable_id: result.subscription.id,
            deleted_on: null,
          },
        });

        // Expiration date = +1 year
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
