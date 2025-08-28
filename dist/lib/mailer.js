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
exports.sendWelcomeEmail = void 0;
exports.sendResetEmail = sendResetEmail;
// lib/mailer.ts
const nodemailer_1 = __importDefault(require("nodemailer"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const handlebars_1 = __importDefault(require("handlebars"));
const transporter = nodemailer_1.default.createTransport({
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
const sendWelcomeEmail = (toEmail) => __awaiter(void 0, void 0, void 0, function* () {
    transporter.sendMail({
        from: `"Test" <${process.env.EMAIL_USER}>`,
        to: toEmail,
        subject: 'Test Email',
        text: 'This is a test email from Nodemailer',
    })
        .then(() => console.log('✅ Email sent!'))
        .catch(err => console.error('❌ Failed to send:', err));
});
exports.sendWelcomeEmail = sendWelcomeEmail;
// ② helper to send a reset email
function sendResetEmail(email, templateName, templateData) {
    return __awaiter(this, void 0, void 0, function* () {
        const templatePath = path_1.default.join(process.cwd(), "templates", templateName);
        // Read the template file
        const source = yield promises_1.default.readFile(templatePath, "utf-8");
        const template = handlebars_1.default.compile(source);
        // Compile the HTML with the template data
        const html = template(templateData);
        // Send the email
        yield transporter.sendMail({
            from: `${process.env.SMTP_FROM_NAME} <${process.env.SMTP_FROM_EMAIL}>`,
            to: email,
            subject: templateData.subject || "Fantasy Life Notification",
            html,
        });
    });
}
