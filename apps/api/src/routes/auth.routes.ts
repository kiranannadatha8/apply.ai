import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/auth.controller";
import { otpLimiter, authLimiter } from "../middleware/limits";

export const authRouter = Router();

// OTP + Magic
authRouter.post("/otp", otpLimiter, asyncWrap(ctrl.requestOtp));
authRouter.post("/otp/verify", authLimiter, asyncWrap(ctrl.verifyOtp));
authRouter.post("/magic/verify", authLimiter, asyncWrap(ctrl.verifyMagic));

// Tokens
authRouter.post("/refresh", asyncWrap(ctrl.refresh));
authRouter.post("/logout", asyncWrap(ctrl.logout));

// Sessions
authRouter.get("/sessions", asyncWrap(ctrl.listSessions));
authRouter.post("/sessions/revoke", asyncWrap(ctrl.revokeSession));

// OAuth
authRouter.get("/oauth/:provider/start", asyncWrap(ctrl.oauthStart));
authRouter.get("/oauth/:provider/callback", asyncWrap(ctrl.oauthCallback));

// Extension handshake
authRouter.post("/ext/handshake/create", asyncWrap(ctrl.createHandshake));
authRouter.post("/ext/session/redeem", asyncWrap(ctrl.redeemHandshake));

// Me
authRouter.get("/me", asyncWrap(ctrl.me));
