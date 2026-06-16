import { Router } from "express";
import { isAuth } from "../../shared/middleware/auth";
import {
  listTasks, getTask, createTask, updateTask,
  toggleTask, removeTask, getLogs, runCleanup,
} from "./schedulerController";

const schedulerRoutes = Router();

schedulerRoutes.get("/scheduler", isAuth, listTasks);
schedulerRoutes.get("/scheduler/logs", isAuth, getLogs);
schedulerRoutes.get("/scheduler/:id", isAuth, getTask);
schedulerRoutes.post("/scheduler", isAuth, createTask);
schedulerRoutes.put("/scheduler/:id", isAuth, updateTask);
schedulerRoutes.patch("/scheduler/:id/toggle", isAuth, toggleTask);
schedulerRoutes.delete("/scheduler/:id", isAuth, removeTask);
schedulerRoutes.post("/scheduler/cleanup-tickets", isAuth, runCleanup);

export default schedulerRoutes;
