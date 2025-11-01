// apps/api/src/routes/jobs.board.routes.ts
import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/jobs.board.controller";
import { requireUser } from "../middleware/require-user";

export const jobsBoardRouter = Router();
jobsBoardRouter.use(requireUser);

jobsBoardRouter.get("/", asyncWrap(ctrl.board));
jobsBoardRouter.post("/move", asyncWrap(ctrl.move));
jobsBoardRouter.post("/reorder", asyncWrap(ctrl.reorderColumn));
