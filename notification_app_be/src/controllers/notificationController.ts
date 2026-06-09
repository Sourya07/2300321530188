import { Request, Response } from "express";
import { Log } from "logging_middleware";
import {
  fetchNotifications,
  getNotificationStats,
  getTopPriorityNotifications,
  markAsViewed,
} from "../services/notificationService";

/**
 * GET /api/notifications
 * Fetches paginated notifications with optional type filter.
 */
export async function getAllNotifications(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const notification_type = req.query.notification_type as string | undefined;

    Log("backend", "info", "controller",
      `getAllNotifications: page=${page}, limit=${limit}, type=${notification_type || "all"}`);

    const result = await fetchNotifications({ page, limit, notification_type });

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Log("backend", "error", "controller", `getAllNotifications failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /api/notifications/stats
 * Returns summary counts for the dashboard cards.
 */
export async function getNotificationStatistics(
  _req: Request,
  res: Response
): Promise<void> {
  try {
    const stats = await getNotificationStats();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Log("backend", "error", "controller", `getNotificationStatistics failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * GET /api/notifications/priority
 * Returns the top-10 priority notifications.
 */
export async function getPriorityNotifications(_req: Request, res: Response): Promise<void> {
  try {
    Log("backend", "info", "controller", "getPriorityNotifications called");

    const top10 = await getTopPriorityNotifications();

    res.status(200).json({
      success: true,
      data: top10,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Log("backend", "error", "controller", `getPriorityNotifications failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}

/**
 * PUT /api/notifications/:id/read
 * Marks a notification as viewed.
 */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    Log("backend", "info", "controller", `markNotificationRead: id=${id}`);

    markAsViewed(id);

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Log("backend", "error", "controller", `markNotificationRead failed: ${msg}`);
    res.status(500).json({ success: false, error: msg });
  }
}
