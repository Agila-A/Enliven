import express from "express"
import { requireAuth } from "../middleware/authMiddleware.js"
import {
  getModuleResources,
  refreshModuleResources,
  getAllCachedResources,
} from "../controllers/webExplorerController.js"

const router = express.Router()

// Get resources for all modules at once
router.get("/all",                  requireAuth, getAllCachedResources)

// Get resources for a specific module (triggers background fetch if stale)
router.get("/:moduleId",            requireAuth, getModuleResources)

// Manually refresh resources for a specific module
router.post("/:moduleId/refresh",   requireAuth, refreshModuleResources)

export default router
