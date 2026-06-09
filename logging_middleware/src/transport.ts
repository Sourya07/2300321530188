import axios from "axios";
import { BASE_URL, LOGS_ENDPOINT } from "./constants";

/**
 * Sends a log payload to the evaluation server.
 * Gracefully handles missing token and network errors
 * with a single retry on transient failures.
 */
export async function sendLog(payload: Record<string, unknown>): Promise<void> {
  const token = process.env.AFFORDMED_TOKEN;
  if (!token) {
    return;
  }

  const url = `${BASE_URL}${LOGS_ENDPOINT}`;
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  // Remove non-spec fields before sending
  const { timestamp, ...cleanPayload } = payload as Record<string, unknown> & { timestamp?: string };

  try {
    await axios.post(url, cleanPayload, { headers, timeout: 5000 });
  } catch (err: unknown) {
    // Single retry on transient failure
    try {
      await axios.post(url, cleanPayload, { headers, timeout: 5000 });
    } catch {
      // Logging must never interrupt the application request lifecycle.
    }
  }
}
