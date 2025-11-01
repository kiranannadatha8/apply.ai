// apps/api/src/routes/jobs.routes.ts
import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import { requireUser } from "../middleware/require-user";
import * as ctrl from "../controllers/jobs.controller";

export const jobsRouter = Router();
jobsRouter.use(requireUser);

jobsRouter.get("/", asyncWrap(ctrl.list));
jobsRouter.get("/:id", asyncWrap(ctrl.get));
jobsRouter.post("/", asyncWrap(ctrl.create));
jobsRouter.patch("/:id", asyncWrap(ctrl.update));
jobsRouter.delete("/:id", asyncWrap(ctrl.remove));
jobsRouter.post("/bulk", asyncWrap(ctrl.bulk));
