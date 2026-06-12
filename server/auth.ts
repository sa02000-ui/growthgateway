import type { Request, Response, NextFunction } from "express";
import { supabase } from "./db";

export interface AuthedRequest extends Request {
  userId?: string;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: "Invalid or expired session" });
      return;
    }

    (req as AuthedRequest).userId = user.id;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({ error: "Authentication failed" });
  }
}

export function getUserId(req: Request): string {
  const userId = (req as AuthedRequest).userId;
  if (!userId) {
    throw new Error("getUserId called on a request without requireAuth");
  }
  return userId;
}
