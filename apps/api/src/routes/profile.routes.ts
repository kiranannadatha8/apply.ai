import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/profile.controller";
export const profileRouter = Router();
profileRouter.get("/", asyncWrap(ctrl.getProfile));
profileRouter.put("/", asyncWrap(ctrl.upsertProfile));
profileRouter.post("/resumes/presign", asyncWrap(ctrl.presign));
profileRouter.post("/resumes/parse", asyncWrap(ctrl.parseResume));
