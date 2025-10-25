import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { ENV } from "./lib/env";
import { logger } from "./lib/logger";
import { authRouter } from "./routes/auth.routes";
import { profileRouter } from "./routes/profile.routes";
import { issueCsrf, requireCsrf } from "./middleware/csrf";
import { captureClient } from "./middleware/client-info";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(cors({ origin: [ENV.WEB_ORIGIN].filter(Boolean), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/v1/health", (_req, res) => res.json({ ok: true }));
app.use("/v1/auth", authRouter);
app.use(captureClient);
app.use(issueCsrf);
app.use(requireCsrf);
app.use("/v1/profile", profileRouter);

export default app;
