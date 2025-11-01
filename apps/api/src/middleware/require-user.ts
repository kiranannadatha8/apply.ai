// apps/api/src/middleware/requireUser.ts
import type { Request, Response, NextFunction } from "express";
import { verifyAccess } from "../lib/token";

export function requireUser(req: Request, res: Response, next: NextFunction) {
  const b = req.headers.authorization?.split(" ")[1];
  if (!b) return res.status(401).json({ title: "Missing token" });
  try {
    const { sub } = verifyAccess<{ sub: string }>(b);
    (req as any).userId = sub;
    next();
  } catch {
    return res.status(401).json({ title: "Invalid token" });
  }
}
