"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const users_1 = __importDefault(require("./routes/users"));
const payments_1 = __importDefault(require("./routes/payments"));
const blogs_1 = __importDefault(require("./routes/blogs"));
const redeemRoute_1 = __importDefault(require("./routes/redeemRoute"));
const app = (0, express_1.default)();
const PORT = 5000;
app.use(express_1.default.json());
app.use((0, cors_1.default)());
app.get("/", (req, res) => {
    res.send("Hello, TypeScript + Express!");
});
app.use("/api/users", users_1.default);
app.use("/api/payments", payments_1.default);
app.use("/api/blogs", blogs_1.default);
app.use("/api", redeemRoute_1.default);
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
