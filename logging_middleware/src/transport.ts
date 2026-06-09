import axios from "axios";
import { BASE_URL, LOGS_ENDPOINT } from "./constants";

export async function sendLog(payload: unknown) {
  const token = process.env.AFFORDMED_TOKEN;
  if (!token) {
    throw new Error("AFFORDMED_TOKEN missing");
  }

  await axios.post(`${BASE_URL}${LOGS_ENDPOINT}`, payload, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}