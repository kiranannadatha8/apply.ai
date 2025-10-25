import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { ENV } from "./lib/env";
import { logger } from "./lib/logger";

const app = express();
app.disable("x-powered-by");
app.use(helmet());
app.use(pinoHttp({ logger }));
app.use(cors({ origin: [ENV.WEB_ORIGIN].filter(Boolean), credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.get("/v1/health", (_req, res) => res.json({ ok: true }));

// TODO: mount domain routes here

// Central error handler (Problem Details style)
app.use((err: any, _req: any, res: any, _next: any) => {
  const status = err.status || 500;
  res.status(status).json({
    type: err.type || "about:blank",
    title: err.title || "Internal Server Error",
    status,
    detail: err.message || "",
    instance: _req?.path || "",
  });
});

export default app;
