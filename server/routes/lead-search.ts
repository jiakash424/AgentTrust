import { Router } from "express";
import { leadSearchController } from "../controllers/lead-search.controller";
import { requireAuth } from "../middleware/auth";

const router = Router();

// POST /api/lead-search/search
router.post("/search", requireAuth, (req, res) =>
  leadSearchController.search(req, res),
);

// GET /api/lead-search/stream/:workflowId
router.get("/stream/:workflowId", (req, res) =>
  leadSearchController.streamProgress(req, res),
);

export default router;
