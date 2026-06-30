import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "mei-facil-secret-key-change-in-production";

export interface AuthRequest extends Request {
  userId?: number;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Token não fornecido" });
    return;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
    req.userId = decoded.userId;
    next();
  } catch {
    res.status(401).json({ error: "Token inválido ou expirado" });
  }
}

export function generateTokens(userId: number) {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "mei-facil-refresh-secret-change-in-production";
  const accessToken = jwt.sign({ userId }, JWT_SECRET, { expiresIn: "15m" });
  const refreshToken = jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: "7d" });
  return { accessToken, refreshToken };
}

export function verifyRefreshToken(token: string): { userId: number } {
  const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "mei-facil-refresh-secret-change-in-production";
  return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: number };
}
