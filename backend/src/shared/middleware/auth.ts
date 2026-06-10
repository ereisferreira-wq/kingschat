import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../database/models/User";

interface JwtPayload {
  id: number;
  companyId: number;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
      companyId?: number;
      userId?: number;
    }
  }
}

export async function isAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: "No token provided" });
  }

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0] !== "Bearer") {
    return res.status(401).json({ error: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(
      parts[1],
      process.env.JWT_SECRET || "secret"
    ) as JwtPayload;

    const user = await User.findByPk(decoded.id, {
      include: ["company"],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found or inactive" });
    }

    const company = (user as any).company;
    if (company && !company.status && !user.super) {
      if (req.method !== "GET") {
        return res.status(403).json({ error: "Company blocked" });
      }
    }

    req.user = user;
    req.userId = user.id;
    req.companyId = user.companyId;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "admin" && !req.user?.super) {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export function isSuper(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.super) {
    return res.status(403).json({ error: "Super admin access required" });
  }
  next();
}
