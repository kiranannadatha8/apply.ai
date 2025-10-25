import type { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/token";

export function requireAccess(req: Request, res: Response, next: NextFunction) {
  const b = req.headers.authorization?.split(" ")[1];
  if (!b) return res.status(401).json({ title: "Missing bearer" });
  try {
    const payload = verifyAccess<{ sub: string }>(b);
    (req as any).userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ title: "Invalid token" });
  }
}
