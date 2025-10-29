import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/profile.controller";
import multer from "multer";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const profileRouter = Router();
profileRouter.get("/", asyncWrap(ctrl.getProfile));
profileRouter.put("/", asyncWrap(ctrl.upsertProfile));
profileRouter.post("/resumes/presign", asyncWrap(ctrl.presign));
profileRouter.post(
  "/resumes/parse",
  upload.single("resume"),
  asyncWrap(ctrl.parseResume),
);
profileRouter.get("/resumes/parse/status", asyncWrap(ctrl.parseStatus));
