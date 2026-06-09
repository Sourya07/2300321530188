import { Router } from "express";
import axios from "axios";
import { Log } from "logging_middleware";

const router = Router();
const baseUrl = process.env.AFFORDMED_BASE_URL!;

/**
 * POST /api/auth/token
 * Fetches a fresh Bearer token from the evaluation server.
 */
router.post("/token", async (_req, res) => {
  try {
    Log("backend", "info", "route", "POST /api/auth/token called");

    const body = {
      email: process.env.AFFORDMED_EMAIL,
      name: process.env.AFFORDMED_NAME,
      rollNo: process.env.AFFORDMED_ROLLNO,
      accessCode: process.env.AFFORDMED_ACCESS_CODE,
      clientID: process.env.AFFORDMED_CLIENT_ID,
      clientSecret: process.env.AFFORDMED_CLIENT_SECRET,
    };

    Log("backend", "debug", "service", "Sending auth request to evaluation-service");

    const response = await axios.post(`${baseUrl}/auth`, body, { timeout: 10000 });

    Log("backend", "info", "service", "Auth request succeeded, token obtained");

    res.status(200).json(response.data);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    Log("backend", "error", "service", `Auth failed: ${msg}`);
    res.status(500).json({ error: "Token generation failed", detail: msg });
  }
});

export default router;
