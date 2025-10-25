import http from "http";
import app from "./app";
import { ENV } from "./lib/env";
import { logger } from "./lib/logger";

const server = http.createServer(app);
server.listen(ENV.PORT, () => {
  logger.info({ port: ENV.PORT }, "API listening");
});

process.on("unhandledRejection", (e) => {
  logger.error(e, "unhandledRejection");
});
process.on("uncaughtException", (e) => {
  logger.error(e, "uncaughtException");
  process.exit(1);
});
