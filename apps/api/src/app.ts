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
import { userRouter } from "./routes/user.routes";
import { dashboardRouter } from "./routes/dashboard.routes";
import { requireAccess } from "./middleware/auth";
import { jobsRouter } from "./routes/jobs.routes";
import { jobsExtRouter } from "./routes/jobs.ext.routes";
import { jobsBoardRouter } from "./routes/jobs.board.routes";

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
app.use("/v1/user", requireAccess, userRouter);
app.use("/v1/profile", requireAccess, profileRouter);
app.use("/v1/dashboard", requireAccess, dashboardRouter);
app.use("/v1/jobs", requireAccess, jobsRouter);
app.use("/v1/jobs/board", requireAccess, jobsBoardRouter);
app.use("/v1/ext/jobs", requireAccess, jobsExtRouter);

export default app;
