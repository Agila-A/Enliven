import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// =======================
// REGISTER
// =======================
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "Email already registered" });

    const hashed = await bcrypt.hash(password, 10);

    const user = await User.create({ name, email, password: hashed });
    const token = createToken(user._id);

    // send cookie (optional) + send token in JSON (required for frontend)
    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      })
      .status(201)
      .json({
        message: "User registered successfully",
        token,     // ⭐ IMPORTANT
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
        },
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// LOGIN
// =======================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "Invalid email or password" });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(400).json({ message: "Invalid email or password" });

    const token = createToken(user._id);

    res
      .cookie("token", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        path: "/",
      })
      .json({
        message: "Logged in successfully",
        token,     // ⭐ IMPORTANT
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          domain: user.domain || null,
        },
      });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// =======================
// LOGOUT
// =======================
export const logout = (req, res) => {
  res
    .clearCookie("token", { path: "/" })
    .json({ message: "Logged out successfully" });
};

// =======================
// GET CURRENT USER
// =======================
export const me = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};