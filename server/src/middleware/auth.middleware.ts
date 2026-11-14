import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";
import prisma from "../lib/prisma";
export interface AuthRequest extends Request {
  user?: JwtPayload & { role?: "USER" | "ADMIN" };
}
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: "Not authenticated" });
  let payload: JwtPayload;
  try {
    payload = verifyToken(token);
    if (typeof payload.userId !== "string") throw new Error("Invalid user");
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true },
    });
    if (!user)
      return res.status(401).json({ error: "Account is no longer available" });
    req.user = { userId: user.id, role: user.role };
    next();
  } catch (error) {
    next(error);
  }
}
export function requireAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "ADMIN")
    return res.status(403).json({ error: "Administrator access required" });
  next();
}
export async function requireOrderOwner(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const id = req.params.id ?? req.body?.orderId;
  if (typeof id !== "string" || !id)
    return res.status(400).json({ message: "orderId is required" });
  try {
    const order = await prisma.order.findFirst({
      where: { id, userId: req.user!.userId },
      select: { id: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    next();
  } catch (error) {
    next(error);
  }
}
export function requireOwnUser(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) {
  if (req.user?.role !== "ADMIN" && req.params.id !== req.user?.userId)
    return res.status(403).json({ message: "Account access denied" });
  next();
}
