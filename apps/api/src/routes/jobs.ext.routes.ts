// apps/api/src/routes/jobs.ext.routes.ts
import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import { requireExt } from "../middleware/require-ext";
import * as ext from "../controllers/jobs.ext.controller";

export const jobsExtRouter = Router();
jobsExtRouter.use(requireExt);

jobsExtRouter.post("/save", asyncWrap(ext.saveFromExtension));
jobsExtRouter.post("/apply", asyncWrap(ext.applyFromExtension));
