import { Request, Response, NextFunction } from "express";
import logger from "../utils/logger";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logger.error(err.message, { stack: err.stack, path: req.path });

  if (err.name === "SequelizeValidationError") {
    return res.status(400).json({ error: "Validation error", details: err.message });
  }

  if (err.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({ error: "Resource already exists" });
  }

  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  res.status(500).json({
    error: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
}
