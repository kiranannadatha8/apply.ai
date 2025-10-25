import rateLimit from "express-rate-limit";

export const otpLimiter = rateLimit({
  windowMs: 60_000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});
export const authLimiter = rateLimit({ windowMs: 60_000, max: 60 });
