import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { Log } from "logging_middleware";
import { tokenService } from "./tokenService";
import { TopKHeap } from "../utils/priorityQueue";

/**
 * Notification shape from the evaluation server API.
 */
export interface RawNotification {
  ID: string;
  Type: "Placement" | "Event" | "Result";
  Message: string;
  Timestamp: string;
}

/**
 * Normalized notification with added fields.
 */
export interface Notification {
  id: string;
  type: "Placement" | "Event" | "Result";
  message: string;
  timestamp: string;
  isViewed: boolean;
  priorityScore?: number;
}

export interface NotificationStats {
  unread: number;
  placements: number;
  results: number;
  events: number;
  total: number;
}

// In-memory fallback until the Prisma client and database migration are deployed.
const viewedSet = new Set<string>();

// Priority weights: Placement > Result > Event
const TYPE_WEIGHTS: Record<string, number> = {
  Placement: 3,
  Result: 2,
  Event: 1,
};

interface UpstreamNotificationResponse {
  notifications?: RawNotification[];
  total?: number;
  totalCount?: number;
}

async function requestNotifications(
  config: AxiosRequestConfig = {},
  retryAfterRefresh = true
): Promise<UpstreamNotificationResponse> {
  const token = await tokenService.getToken();
  const baseUrl = process.env.AFFORDMED_BASE_URL;

  if (!baseUrl) {
    throw new Error("AFFORDMED_BASE_URL is not configured");
  }

  try {
    const response = await axios.get<UpstreamNotificationResponse | RawNotification[]>(
      `${baseUrl}/notifications`,
      {
        ...config,
        headers: {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        },
        timeout: 10000,
      }
    );

    if (Array.isArray(response.data)) {
      return { notifications: response.data };
    }

    return response.data;
  } catch (error: unknown) {
    if (
      retryAfterRefresh
      && error instanceof AxiosError
      && error.response?.status === 401
    ) {
      Log("backend", "warn", "auth",
        "Notification API rejected the cached token; refreshing and retrying once");
      tokenService.invalidateToken();
      return requestNotifications(config, false);
    }

    throw error;
  }
}

function describeUpstreamError(error: unknown): string {
  if (!(error instanceof AxiosError)) {
    return error instanceof Error ? error.message : String(error);
  }

  const status = error.response?.status;
  const responseMessage = error.response?.data
    && typeof error.response.data === "object"
    && "message" in error.response.data
    ? String(error.response.data.message)
    : error.message;

  return status ? `upstream returned ${status}: ${responseMessage}` : responseMessage;
}

/**
 * Computes priority score for a notification.
 * Score = typeWeight + recencyBonus (0-1 scale, decays over 7 days)
 */
function computePriorityScore(notification: RawNotification): number {
  const typeWeight = TYPE_WEIGHTS[notification.Type] || 0;
  const now = Date.now();
  const ts = new Date(notification.Timestamp).getTime();
  const ageMs = now - ts;
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  // Recency bonus: 1.0 for brand new, 0.0 for 7+ days old
  const recencyBonus = Math.max(0, 1 - ageMs / sevenDaysMs);

  return typeWeight + recencyBonus;
}

/**
 * Normalizes a raw notification from the evaluation API.
 */
function normalize(raw: RawNotification): Notification {
  return {
    id: raw.ID,
    type: raw.Type,
    message: raw.Message,
    timestamp: raw.Timestamp,
    isViewed: viewedSet.has(raw.ID),
  };
}

/**
 * Fetches all notifications from the evaluation server.
 */
export async function fetchAllNotifications(): Promise<RawNotification[]> {
  Log("backend", "info", "service", "Fetching all notifications from evaluation API");

  try {
    const response = await requestNotifications();
    const notifications = response.notifications ?? [];
    Log("backend", "info", "service", `Fetched ${notifications.length} notifications`);
    return notifications;
  } catch (err: unknown) {
    const msg = describeUpstreamError(err);
    Log("backend", "error", "service", `Failed to fetch notifications: ${msg}`);
    throw new Error(`Failed to fetch notifications: ${msg}`);
  }
}

/**
 * Fetches notifications with pagination and optional type filter.
 */
export async function fetchNotifications(params: {
  page?: number;
  limit?: number;
  notification_type?: string;
}): Promise<{ notifications: Notification[]; total: number; page: number; limit: number }> {
  const page = params.page || 1;
  const requestedLimit = params.limit || 10;
  // Upstream API requires limit >= 5
  const apiLimit = Math.max(5, requestedLimit);

  Log("backend", "debug", "service",
    `Fetching notifications page=${page} limit=${requestedLimit} (apiLimit=${apiLimit}) type=${params.notification_type || "all"}`);

  try {
    // Build query params for the evaluation API
    const queryParams: Record<string, string | number> = { page, limit: apiLimit };
    if (params.notification_type) {
      queryParams.notification_type = params.notification_type;
    }

    const response = await requestNotifications({
      params: queryParams,
    });

    const raw = response.notifications ?? [];
    let notifications = raw.map(normalize);

    // If client requested fewer than 5, slice the response to match their request
    if (notifications.length > requestedLimit) {
      notifications = notifications.slice(0, requestedLimit);
    }

    const offset = (page - 1) * requestedLimit;
    const reportedTotal = response.total ?? response.totalCount;
    const estimatedTotal = raw.length < apiLimit
      ? offset + notifications.length
      : offset + requestedLimit + 1;

    Log("backend", "info", "service",
      `Returned ${notifications.length} notifications for page ${page}`);

    return {
      notifications,
      total: reportedTotal ?? estimatedTotal,
      page,
      limit: requestedLimit,
    };
  } catch (err: unknown) {
    const msg = describeUpstreamError(err);
    Log("backend", "error", "service", `Notification fetch failed: ${msg}`);
    throw new Error(`Notification fetch failed: ${msg}`);
  }
}

/**
 * Computes the top-10 priority notifications using a min-heap.
 *
 * Priority = typeWeight (Placement=3, Result=2, Event=1) + recencyBonus (0-1).
 * Uses TopKHeap to efficiently maintain only the top 10.
 */
export async function getTopPriorityNotifications(): Promise<Notification[]> {
  Log("backend", "info", "service", "Computing top-10 priority notifications");

  const allNotifications = await fetchAllNotifications();
  const heap = new TopKHeap<RawNotification>(10);

  for (const notification of allNotifications) {
    const score = computePriorityScore(notification);
    heap.insert(score, notification);
  }

  const topItems = heap.getTopK();
  const result = topItems.map((entry) => ({
    ...normalize(entry.item),
    priorityScore: Math.round(entry.score * 100) / 100,
  }));

  Log("backend", "info", "service",
    `Top-10 computed: ${result.map((n) => `${n.type}(${n.priorityScore})`).join(", ")}`);

  return result;
}

export async function getNotificationStats(): Promise<NotificationStats> {
  Log("backend", "info", "service", "Computing notification summary statistics");

  const notifications = await fetchAllNotifications();

  return notifications.reduce<NotificationStats>(
    (stats, notification) => {
      stats.total += 1;

      if (!viewedSet.has(notification.ID)) {
        stats.unread += 1;
      }

      if (notification.Type === "Placement") {
        stats.placements += 1;
      } else if (notification.Type === "Result") {
        stats.results += 1;
      } else {
        stats.events += 1;
      }

      return stats;
    },
    {
      unread: 0,
      placements: 0,
      results: 0,
      events: 0,
      total: 0,
    }
  );
}

/**
 * Marks a notification as viewed (in-memory tracking).
 */
export function markAsViewed(notificationId: string): void {
  viewedSet.add(notificationId);
  Log("backend", "info", "service", `Notification ${notificationId} marked as viewed`);
}
