import { Router } from "express";
import { asyncWrap } from "../utils/asyncWrap";
import * as ctrl from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get("/summary", asyncWrap(ctrl.summary));
dashboardRouter.get("/recent", asyncWrap(ctrl.recent));
