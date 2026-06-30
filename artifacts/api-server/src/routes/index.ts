import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import profileRouter from "./profile";
import dashboardRouter from "./dashboard";
import revenueRouter from "./revenue";
import taxesRouter from "./taxes";
import documentsRouter from "./documents";
import alertsRouter from "./alerts";
import declarationRouter from "./declaration";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(profileRouter);
router.use(dashboardRouter);
router.use(revenueRouter);
router.use(taxesRouter);
router.use(documentsRouter);
router.use(alertsRouter);
router.use(declarationRouter);
router.use(aiRouter);

export default router;
