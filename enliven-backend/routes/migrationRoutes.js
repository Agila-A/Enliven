// routes/migrationRoutes.js
import express from "express";
import { runMigration } from "../controllers/migrationController.js";

const router = express.Router();

// POST /api/migration/run
// Runs the one-time data migration. Safe to call multiple times.
// In production, protect this with an admin check or a secret header.
router.post("/run", runMigration);

export default router;
