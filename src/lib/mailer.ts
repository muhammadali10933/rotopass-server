// lib/mailer.ts
import nodemailer from "nodemailer";
import fs from "fs/promises";
import path from "path";
import Handlebars from "handlebars";
import { getTimeInEDT } from "./utils";

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: true, // use SSL
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  logger: true,
  debug: true
});

export const sendWelcomeEmail = async (toEmail: string) => {
  transporter.sendMail({
    from: `"Test" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: 'Test Email',
    text: 'This is a test email from Nodemailer',
  })
    .then(() => console.log('✅ Email sent!'))
    .catch(err => console.error('❌ Failed to send:', err));
};

// ② helper to send a reset email
export async function sendResetEmail(email: string, templateName: string, templateData: { [key: string]: any }) { // type: "signup" | "reset-password"

  const templatePath = path.join(process.cwd(), "templates", templateName);

  // Read the template file
  const source = await fs.readFile(templatePath, "utf-8");
  const template = Handlebars.compile(source);

  // Compile the HTML with the template data
  const html = template(templateData);

  // Send the email
  await transporter.sendMail({
    from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
    to: email,
    subject: templateData.subject || "Fantasy Life Notification",
    html,
  });
}
