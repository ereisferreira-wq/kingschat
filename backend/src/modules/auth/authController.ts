import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { hash } from "bcryptjs";
import User from "../../shared/database/models/User";
import Company from "../../shared/database/models/Company";
import Plan from "../../shared/database/models/Plan";

function generateToken(user: User) {
  const payload = { id: user.id, companyId: user.companyId, role: user.role };
  return {
    token: jwt.sign(payload, process.env.JWT_SECRET || "secret", {
      expiresIn: "24h",
    }),
    refreshToken: jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || "refresh_secret",
      { expiresIn: "7d" }
    ),
  };
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password required" });
  }

  const user = await User.findOne({
    where: { email },
    include: [{ model: Company, include: [{ model: Plan, as: "plan" }] }],
  });

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  if (!user.isActive) {
    return res.status(403).json({ error: "Account inactive" });
  }

  if (user.company && !user.company.status && !user.super) {
    return res.status(403).json({ error: "Company blocked. Contact administrator." });
  }

  const valid = await user.checkPassword(password);
  if (!valid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const company = user.company;

  await user.update({ lastLogin: new Date() });

  const tokens = generateToken(user);

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      company: company
        ? {
            id: company.id,
            name: company.name,
            status: company.status,
            plan: company.plan?.name || null,
            dueDate: company.dueDate,
            logo: (company as any).logo || "",
          }
        : null,
    },
    ...tokens,
  });
}

export async function signup(req: Request, res: Response) {
  const { name, email, password, phone, companyName, planId } = req.body;

  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    return res.status(409).json({ error: "Email already registered" });
  }

  let selectedPlan;
  if (planId) {
    selectedPlan = await Plan.findOne({ where: { id: planId, isActive: true } });
    if (!selectedPlan) {
      return res.status(400).json({ error: "Invalid plan" });
    }
  } else {
    selectedPlan = await Plan.findOne({
      where: { isActive: true },
      order: [["price", "ASC"]],
    });
  }
  if (!selectedPlan) {
    return res.status(500).json({ error: "No available plan" });
  }

  const receiptPath = req.file ? (req.file as any).path : "";

  const company = await Company.create({
    name: companyName || name + "'s Company",
    email,
    phone,
    status: false,
    planId: selectedPlan.id,
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    paymentReceipt: receiptPath,
  });

  const user = await User.create({
    name,
    email,
    password,
    role: "user",
    super: false,
    companyId: company.id,
    isActive: true,
  });

  const tokens = generateToken(user);

  const companyData = await Company.findByPk(company.id, { include: [{ model: Plan, as: "plan" }] });

  res.status(201).json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: null,
      company: companyData
        ? {
            id: companyData.id,
            name: companyData.name,
            status: companyData.status,
            plan: companyData.plan?.name || null,
            dueDate: companyData.dueDate,
            logo: (companyData as any).logo || "",
          }
        : null,
    },
    ...tokens,
  });
}

export async function refreshToken(req: Request, res: Response) {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token required" });
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET || "refresh_secret"
    ) as any;

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Company, include: [{ model: Plan, as: "plan" }] }],
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: "User not found" });
    }

    const tokens = generateToken(user);
    res.json(tokens);
  } catch {
    return res.status(401).json({ error: "Invalid refresh token" });
  }
}

export async function me(req: Request, res: Response) {
  const user = await User.findByPk(req.userId, {
    attributes: { exclude: ["passwordHash"] },
    include: [{ model: Company, include: [{ model: Plan, as: "plan" }] }],
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const company = user.company;

  res.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage,
      company: company
        ? {
            id: company.id,
            name: company.name,
            status: company.status,
            plan: company.plan?.name || null,
            dueDate: company.dueDate,
            logo: (company as any).logo || "",
          }
        : null,
    },
  });
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current and new password required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const user = await User.findByPk(req.userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const valid = await user.checkPassword(currentPassword);
  if (!valid) {
    return res.status(401).json({ error: "Current password is incorrect" });
  }

  const hashed = await hash(newPassword, 12);
  await User.update({ passwordHash: hashed }, { where: { id: user.id } });
  res.json({ message: "Password changed successfully" });
}

export async function adminResetPassword(req: Request, res: Response) {
  const { userId, newPassword } = req.body;

  if (!userId || !newPassword) {
    return res.status(400).json({ error: "UserId and new password required" });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const user = await User.findByPk(userId);
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.companyId !== req.companyId) {
    return res.status(403).json({ error: "Cannot reset password for user outside your company" });
  }

  const hashed = await hash(newPassword, 12);
  await User.update({ passwordHash: hashed }, { where: { id: user.id } });
  res.json({ message: "Password reset successfully", userId });
}

export async function getUsers(req: Request, res: Response) {
  try {
    const user = await User.findByPk(req.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const users = await User.findAll({
      where: { companyId: user.companyId },
      attributes: { exclude: ["passwordHash"] },
      order: [["createdAt", "ASC"]],
    });

    res.json({
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: u.isActive,
        createdAt: u.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
}

export async function pixInfo(req: Request, res: Response) {
  res.json({
    bank: "336 - Banco C6 S.A.",
    agency: "0001",
    account: "37632361-2",
    cnpj: "41.543.276/0001-01",
    name: "41.543.276 ERIK REIS FERREIRA",
    pixKey: "41.543.276/0001-01",
  });
}
