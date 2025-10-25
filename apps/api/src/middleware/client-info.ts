import type { Request, Response, NextFunction } from "express";
import { UAParser } from "ua-parser-js";
export function captureClient(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const ip = (
    req.headers["x-forwarded-for"]?.toString().split(",")[0] ||
    req.socket.remoteAddress ||
    ""
  ).slice(0, 45);
  const userAgent = req.headers["user-agent"] || "";
  (req as any).clientInfo = { ip, ua: new UAParser(userAgent).getResult() };
  next();
}
