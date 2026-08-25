import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
import prisma from "../lib/prisma";
import { signToken, verifyToken as verifyJwt } from "../lib/jwt";
import { sendVerifyEmail } from "../lib/email/service/email";

const SALT_ROUNDS = 12;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3001";
const OTP_SECRET = process.env.OTP_SECRET as string;
const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days, matches JWT expiry
};

function hashCode(code: string): string {
  return crypto.createHmac("sha256", OTP_SECRET).update(code).digest("hex");
}

function codesMatch(submittedHash: string, storedHash: string): boolean {
  const a = Buffer.from(submittedHash);
  const b = Buffer.from(storedHash);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function issueVerificationCode(user: {
  id: string;
  email: string;
  name: string;
}) {
  const code = crypto.randomInt(100000, 999999).toString();
  const verificationCodeHash = hashCode(code);
  const verificationCodeExpires = new Date(Date.now() + OTP_TTL_MS);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verificationCodeHash,
      verificationCodeExpires,
      verificationAttempts: 0,
    },
  });

  const verifyToken = signToken({ userId: user.id }, { expiresIn: "10m" });

  if (process.env.RESEND_API_KEY) {
    await sendVerifyEmail({
      email: user.email,
      code,
      verifyUrl: `${FRONTEND_URL}/verify-email?token=${verifyToken}`,
      manageUrl: `${FRONTEND_URL}/account`,
      unsubscribeUrl: `${FRONTEND_URL}/unsubscribe`,
    });
  } else {
    console.log(
      `[email] Resend not configured — would have sent verification code ${code} to ${user.email}`,
    );
  }
}

export async function register(req: Request, res: Response) {
  const { name, email, password, phone, address } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "name, email, and password are required" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "Email already in use" });
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashedPassword,
      phone,
      address,
      emailVerified: false,
      verificationAttempts: 0,
    },
  });

  // No login token/cookie yet — issued only after the user verifies their email.
  await issueVerificationCode(user);

  return res.status(201).json({
    message: "Verification email sent",
    user: { id: user.id, name: user.name, email: user.email },
  });
}

// Link-based verification (user clicks the emailed link).
export async function verifyEmail(req: Request, res: Response) {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: "Verification token is required" });
  }

  let payload;
  try {
    payload = verifyJwt(token);
  } catch {
    return res
      .status(400)
      .json({ error: "This verification link is invalid or has expired" });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (!user.emailVerified) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        verificationCodeHash: null,
        verificationCodeExpires: null,
        verificationAttempts: 0,
      },
    });
  }

  const loginToken = signToken({ userId: user.id });
  res.cookie("token", loginToken, COOKIE_OPTIONS);

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}

// Code-based verification (user manually enters the 6-digit code).
export async function verifyCode(req: Request, res: Response) {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email and code are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  if (user.emailVerified) {
    // Already verified — treat as success (idempotent).
    const loginToken = signToken({ userId: user.id });
    res.cookie("token", loginToken, COOKIE_OPTIONS);
    return res
      .status(200)
      .json({ user: { id: user.id, name: user.name, email: user.email } });
  }

  if (!user.verificationCodeHash || !user.verificationCodeExpires) {
    return res
      .status(400)
      .json({ error: "No verification code found. Please request a new one." });
  }

  if (user.verificationAttempts >= MAX_OTP_ATTEMPTS) {
    return res
      .status(429)
      .json({ error: "Too many attempts. Please request a new code." });
  }

  if (new Date() > user.verificationCodeExpires) {
    return res
      .status(400)
      .json({ error: "This code has expired. Please request a new one." });
  }

  const submittedHash = hashCode(code);
  const isValid = codesMatch(submittedHash, user.verificationCodeHash);

  if (!isValid) {
    await prisma.user.update({
      where: { id: user.id },
      data: { verificationAttempts: { increment: 1 } },
    });
    return res.status(400).json({ error: "Incorrect code" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationCodeHash: null,
      verificationCodeExpires: null,
      verificationAttempts: 0,
    },
  });

  const loginToken = signToken({ userId: user.id });
  res.cookie("token", loginToken, COOKIE_OPTIONS);

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  if (!user.emailVerified) {
    await issueVerificationCode(user);
    return res.status(403).json({
      error: "Please verify your email to continue",
      requiresVerification: true,
      email: user.email,
    });
  }

  const token = signToken({ userId: user.id });

  res.cookie("token", token, COOKIE_OPTIONS);

  return res.status(200).json({
    user: { id: user.id, name: user.name, email: user.email },
  });
}

export async function logout(_req: Request, res: Response) {
  res.clearCookie("token", COOKIE_OPTIONS);
  return res.status(200).json({ message: "Logged out" });
}

export async function me(req: Request, res: Response) {
  const authReq = req as Request & { user?: { userId: string } };

  if (!authReq.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = await prisma.user.findUnique({
    where: { id: authReq.user.userId },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  return res.status(200).json({ user });
}
