import { Router } from "express";
import {
  getAllNotifications,
  getNotificationStatistics,
  getPriorityNotifications,
  markNotificationRead,
} from "../controllers/notificationController";

const router = Router();

// GET /api/notifications/priority — must be before /:id to avoid conflict
router.get("/priority", getPriorityNotifications);

// GET /api/notifications/stats — dashboard summary counts
router.get("/stats", getNotificationStatistics);

// GET /api/notifications — paginated list with optional type filter
router.get("/", getAllNotifications);

// PUT /api/notifications/:id/read — mark as viewed
router.put("/:id/read", markNotificationRead);

export default router;
