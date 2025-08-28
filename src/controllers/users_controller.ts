import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendResetEmail, sendWelcomeEmail } from "../lib/mailer";
import { getTimeInEDT } from "../lib/utils";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "default_secret_key"; // Use a secure secret key in production

const userController = {
  registerUserController: async (req: Request, res: Response): Promise<void> => {
    const { firstName, lastName, email, password } = req.body;

    try {
      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(400).json({ error: "User already exists" });
        return;
      }

      const hashedPassword = bcrypt.hashSync(password, 10); // Hash password

      // Create new user
      const newUser = await prisma.user.create({
        data: {
          first_name: firstName,
          last_name: lastName,
          email,
          status: 0,
        },
      });

      // Save password into UserPassword table
      await prisma.userPassword.create({
        data: {
          user_id: newUser.id,
          password: hashedPassword,
        },
      });

      const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET);
      res.status(201).json({ error: null, token });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  loginUserController: async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(400).json({ error: "Incorrect Username or Password" });
        return;
      }

      const userPasswordRecord = await prisma.userPassword.findUnique({
        where: { user_id: user.id },
      });

      const isPasswordValid =
        userPasswordRecord && bcrypt.compareSync(password, userPasswordRecord.password);

      if (!isPasswordValid) {
        res.status(400).json({ error: "Incorrect Username or Password" });
        return;
      }

      const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET);

      const latestPurchase = await prisma.purchase.findFirst({
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
    } catch (error) {
      console.error("Error logging in user:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  checkExpiresController: async (req: Request, res: Response): Promise<void> => {
    const { id } = req.body;
    if (!id) {
      res.status(400).json({ error: "No userID requested" });
      return;
    }

    try {
      const latestPurchase = await prisma.purchase.findFirst({
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
    } catch (error) {
      console.error("Error checking expiration:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  forgotPasswordController: async (req: Request, res: Response): Promise<void> => {
    const { email } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(400).json({ error: "User not found" });
        return;
      }

      const resetToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: "1h" });

      const templateData = {
        email,
        resetLink: `${process.env.FRONTEND_URL}/reset?token=${resetToken}`,
        subject: "Reset Password Instructions",
        time: getTimeInEDT(),
      };

      await sendResetEmail(email, "reset-password.html", templateData);

      res.status(200).json({
        message: "Check your email for instructions on how to reset your password.",
      });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  resetPasswordController: async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        res.status(400).json({ error: "User not found" });
        return;
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      const userPasswordRecord = await prisma.userPassword.findUnique({
        where: { user_id: user.id },
      });

      if (!userPasswordRecord) {
        res.status(404).json({ error: "User password record not found" });
        return;
      }

      await prisma.userPassword.update({
        where: { id: userPasswordRecord.id },
        data: { password: hashedPassword },
      });

      res.status(200).json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },

  freeSignUpController: async (req: Request, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: "Email is required" });
        return;
      }

      const response = await fetch(
        `https://api.beehiiv.com/v2/publications/${process.env.BEEHIIV_PUBLICATION_ID}/subscriptions`,
        {
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
        }
      );

      const responseText = await response.text();
      console.log("Beehiiv response:", response.status, responseText);

      if (!response.ok) {
        let errorMessage = "Subscription failed";
        try {
          const errorData = JSON.parse(responseText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // ignore parsing error
        }
        res.status(response.status).json({ error: errorMessage });
        return;
      }

      res.status(200).json({ success: true });
    } catch (error) {
      console.error("Error in free signup:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },
};

export default userController;
