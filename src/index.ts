import express, { Request, Response } from "express";
import cors from "cors";
import usersRoute from "./routes/users";
import paymentsRoute from "./routes/payments";
import blogsRoute from "./routes/blogs";
import redeemRoute from "./routes/redeemRoute";
const app = express();
const PORT = 5000;

app.use(express.json());
app.use(cors());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello, TypeScript + Express!");
});

app.use("/api/users", usersRoute);
app.use("/api/payments", paymentsRoute);
app.use("/api/blogs", blogsRoute);
app.use("/api", redeemRoute);
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
