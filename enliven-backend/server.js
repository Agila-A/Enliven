import dotenv from "dotenv";
dotenv.config(); 

import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import roadmapRoutes from "./routes/roadmapRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import notesRoutes from "./routes/notesRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import dashboardRoutes from "./routes/dashboardRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import proctorRoutes from "./routes/proctorRoutes.js"
import learningPathRoutes from "./routes/learningPathRoutes.js";
const app = express();

app.use(express.json({ strict: false }));
app.use(cookieParser());

app.use(
  cors({   
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/roadmap", roadmapRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/proctor", proctorRoutes);
app.use("/api/learning-path", learningPathRoutes);

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT, () =>
      console.log(`Server running on port ${process.env.PORT}`)
    );
  })
  .catch((err) => console.error("DB Error:", err.message));

  console.log("GROQ KEY:", process.env.GROQ_API_KEY);