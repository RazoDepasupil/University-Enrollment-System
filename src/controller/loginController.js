import jwt from "jsonwebtoken";
import { sys } from "../shared.js";
import dotenv from "dotenv";
dotenv.config();

const SECRET = process.env.JWT_SECRET || "eduportal-jwt-secret-2025";

export default function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password)
    return res
      .status(400)
      .json({ error: "username and password are required" });

  let user = null;

  // Support login by username or ID for both students and faculty
  user = sys.authenticate(username, password, "student");
  if (!user) user = sys.authenticate(username, password, "faculty");

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, role: user.role }, SECRET, {
    expiresIn: "8h",
  });

  const profile = {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    initials: user.getInitials(),
    ...(user.role === "student"
      ? { program: user.program, yearLevel: user.yearLevel, email: user.email }
      : { dept: user.dept }),
  };

  res.json({ token, user: profile });
}
