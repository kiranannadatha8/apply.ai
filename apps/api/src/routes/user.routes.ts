import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/user.controller";
export const userRouter = Router();

userRouter.get("/me", asyncWrap(ctrl.me));
userRouter.patch("/onboarding", asyncWrap(ctrl.setOnboarding));
