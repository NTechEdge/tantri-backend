import crypto from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models';
import type { UserDTO } from '../types';

export const COOKIE_NAME = 'tt';

export interface AuthRequest extends Request {
  user?: UserDTO | null;
}

function getSecret(): string {
  return process.env.JWT_SECRET || 'dev-secret';
}

export function getAdminEmails(): string[] {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  return getAdminEmails().includes(email.trim().toLowerCase());
}

export function hashOtp(email: string, code: string): string {
  return crypto
    .createHash('sha256')
    .update(email.trim().toLowerCase() + code + getSecret())
    .digest('hex');
}

export function signAuthToken(userId: string): string {
  return jwt.sign({ id: userId }, getSecret(), { expiresIn: '14d' });
}

export async function attachUser(req: AuthRequest, _res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) {
    req.user = null;
    return next();
  }
  try {
    const decoded = jwt.verify(token, getSecret()) as { id: string };
    const u = await User.findById(decoded.id).lean();
    req.user = u
      ? {
          id: String(u._id),
          email: u.email,
          name: u.name || '',
          phone: u.phone || '',
          role: u.role,
        }
      : null;
  } catch {
    req.user = null;
  }
  next();
}

export function requireUser(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) return res.status(401).json({ error: 'Please log in' });
  next();
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  next();
}
