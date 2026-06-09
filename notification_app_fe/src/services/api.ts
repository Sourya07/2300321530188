import axios from "axios";

const API_BASE_URL = "http://localhost:4000/api";

export interface Notification {
  id: string;
  type: "Placement" | "Event" | "Result";
  message: string;
  timestamp: string;
  isViewed: boolean;
  priorityScore?: number;
}

export interface PaginatedResult {
  notifications: Notification[];
  total: number;
  page: number;
  limit: number;
}

export interface NotificationStats {
  unread: number;
  placements: number;
  results: number;
  events: number;
  total: number;
}

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) {
    return error instanceof Error ? error.message : fallback;
  }

  const serverMessage = error.response?.data?.error ?? error.response?.data?.message;
  if (typeof serverMessage === "string" && serverMessage) {
    return serverMessage;
  }

  if (!error.response) {
    return "Cannot reach the notification server. Confirm the backend is running on port 4000.";
  }

  return `${fallback} (HTTP ${error.response.status})`;
}

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

/**
 * Fetches paginated notifications from the local backend, with optional type filter.
 */
export async function getNotifications(
  page: number = 1,
  limit: number = 10,
  type?: string
): Promise<PaginatedResult> {
  const params: Record<string, string | number> = { page, limit };
  if (type) {
    params.notification_type = type;
  }

  try {
    const response = await api.get<{ success: boolean; data: PaginatedResult }>(
      "/notifications",
      { params }
    );

    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, "Failed to load notifications"));
  }
}

/**
 * Fetches the top-10 priority notifications computed by the backend min-heap.
 */
export async function getPriorityNotifications(): Promise<Notification[]> {
  try {
    const response = await api.get<{ success: boolean; data: Notification[] }>(
      "/notifications/priority"
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, "Failed to load priority notifications"));
  }
}

export async function getNotificationStats(): Promise<NotificationStats> {
  try {
    const response = await api.get<{ success: boolean; data: NotificationStats }>(
      "/notifications/stats"
    );
    return response.data.data;
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, "Failed to load notification statistics"));
  }
}

/**
 * Marks a notification as viewed/read.
 */
export async function markNotificationAsRead(id: string): Promise<void> {
  try {
    await api.put(`/notifications/${id}/read`);
  } catch (error: unknown) {
    throw new Error(getApiErrorMessage(error, "Failed to mark notification as read"));
  }
}
