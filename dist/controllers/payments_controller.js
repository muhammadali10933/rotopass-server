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
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const braintree_1 = require("../lib/braintree");
const prisma = new client_1.PrismaClient();
const paymentsController = {
    createClientTokenController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const response = yield braintree_1.gateway.clientToken.generate({});
            res.send({
                clientToken: response.clientToken,
                error: null,
            });
        }
        catch (error) {
            console.error("Error generating client token:", error);
            res.status(500).json({ error: "Failed to generate client token" });
        }
    }),
    checkoutController: (req, res) => __awaiter(void 0, void 0, void 0, function* () {
        var _a;
        const { nonce } = req.body;
        const { user } = req;
        if (!nonce) {
            res.status(400).json({ error: "Payment nonce is required" });
            return;
        }
        try {
            let customer = null;
            // ✅ Check if user already has a purchase/subscription record
            const subscriptionRecord = yield prisma.purchase.findFirst({
                where: { owner_id: user.id },
            });
            if (subscriptionRecord === null || subscriptionRecord === void 0 ? void 0 : subscriptionRecord.billable_id) {
                // Existing subscription → fetch from Braintree
                const subscription = yield braintree_1.gateway.subscription.find(subscriptionRecord.billable_id);
                const customerId = subscription.transactions && subscription.transactions.length > 0
                    ? (_a = subscription.transactions[0]) === null || _a === void 0 ? void 0 : _a.customer.id
                    : undefined;
                if (!customerId) {
                    throw new Error("Customer ID not found in subscription transactions");
                }
                customer = yield braintree_1.gateway.customer.find(customerId);
            }
            else {
                // New customer → create in Braintree
                const customerResult = yield braintree_1.gateway.customer.create({
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
            const result = yield braintree_1.gateway.subscription.create({
                paymentMethodToken: customer.paymentMethods && customer.paymentMethods.length > 0
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
                const newPurchase = yield prisma.purchase.create({
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
            }
            else {
                res.status(400).json({ error: result.message });
            }
        }
        catch (error) {
            console.error("Error processing transaction:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    }),
};
exports.default = paymentsController;
