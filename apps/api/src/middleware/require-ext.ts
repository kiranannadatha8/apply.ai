// apps/api/src/middleware/requireExt.ts
import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export function requireExt(req: Request, res: Response, next: NextFunction) {
  const b = req.headers.authorization?.split(" ")[1];
  if (!b) return res.status(401).json({ title: "Missing token" });
  try {
    const payload = jwt.verify(b, process.env.SESSION_SECRET!) as any;
    if (payload?.typ !== "ext" || payload?.scope !== "extension")
      return res.status(401).json({ title: "Invalid token" });
    (req as any).userId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ title: "Invalid token" });
  }
}
