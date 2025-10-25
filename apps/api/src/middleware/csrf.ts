import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";

export function issueCsrf(req: Request, res: Response, next: NextFunction) {
  // Only set if missing
  if (!req.cookies?.[CSRF_COOKIE]) {
    const token = crypto.randomBytes(16).toString("hex");
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }
  next();
}

export function requireCsrf(req: Request, res: Response, next: NextFunction) {
  const method = req.method.toUpperCase();
  // Safe methods skip check
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return next();
  const cookie = req.cookies?.[CSRF_COOKIE];
  const header = req.header(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    return res.status(403).json({ title: "CSRF token invalid", status: 403 });
  }
  next();
}
