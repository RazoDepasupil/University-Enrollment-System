import jwt from "jsonwebtoken";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.JWT_SECRET || "eduportal-jwt-secret-2025";

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer "))
    return res.status(401).json({ error: "Missing or invalid token" });
  try {
    req.user = jwt.verify(auth.slice(7), SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Token expired or invalid" });
  }
}

export function studentOnly(req, res, next) {
  if (req.user.role !== "student")
    return res.status(403).json({ error: "Students only" });
  next();
}

export function facultyOnly(req, res, next) {
  if (req.user.role !== "faculty")
    return res.status(403).json({ error: "Faculty only" });
  next();
}
