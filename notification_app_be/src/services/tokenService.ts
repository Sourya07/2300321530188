import axios from "axios";
import { Log } from "logging_middleware";

/**
 * Manages the Bearer token lifecycle — caches the token
 * and auto-refreshes it before expiry.
 */
class TokenService {
  private token: string | null = null;
  private expiresAt: number = 0;
  private refreshPromise: Promise<string> | null = null;

  private getJwtExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64url").toString("utf8")
      ) as { exp?: number; MapClaims?: { exp?: number } };

      return payload.exp ?? payload.MapClaims?.exp ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Returns a valid Bearer token, refreshing if expired or about to expire.
   */
  async getToken(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);

    // Use cached token if still valid (with 60s buffer)
    if (this.token && this.expiresAt - now > 60) {
      return this.token;
    }

    // Check if we have a static token in env (fallback)
    const staticToken = process.env.AFFORDMED_TOKEN;
    const staticTokenExpiry = staticToken ? this.getJwtExpiry(staticToken) : null;
    if (staticToken && staticTokenExpiry && staticTokenExpiry - now > 60) {
      this.token = staticToken;
      this.expiresAt = staticTokenExpiry;
      return this.token;
    }

    if (staticToken) {
      Log("backend", "warn", "auth",
        "Configured bearer token is expired or has no readable expiry; requesting a fresh token");
    }

    if (!this.refreshPromise) {
      this.refreshPromise = this.refreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }

    return this.refreshPromise;
  }

  invalidateToken(): void {
    this.token = null;
    this.expiresAt = 0;
  }

  /**
   * Calls the auth endpoint to get a fresh Bearer token.
   */
  private async refreshToken(): Promise<string> {
    const baseUrl = process.env.AFFORDMED_BASE_URL!;
    const body = {
      email: process.env.AFFORDMED_EMAIL,
      name: process.env.AFFORDMED_NAME,
      rollNo: process.env.AFFORDMED_ROLLNO,
      accessCode: process.env.AFFORDMED_ACCESS_CODE,
      clientID: process.env.AFFORDMED_CLIENT_ID,
      clientSecret: process.env.AFFORDMED_CLIENT_SECRET,
    };

    try {
      Log("backend", "info", "auth", "Refreshing Bearer token from auth API");

      const response = await axios.post(`${baseUrl}/auth`, body, {
        timeout: 10000,
      });

      const accessToken = response.data.access_token;
      if (typeof accessToken !== "string" || !accessToken) {
        throw new Error("Auth API response did not include an access token");
      }

      const jwtExpiry = this.getJwtExpiry(accessToken);
      const expiresIn = Number(response.data.expires_in);

      this.token = accessToken;
      this.expiresAt = jwtExpiry
        ?? (expiresIn > nowSeconds() ? expiresIn : nowSeconds() + expiresIn);

      Log("backend", "info", "auth", `Token refreshed, expires at ${this.expiresAt}`);

      // Also update the env var so logging middleware picks it up
      process.env.AFFORDMED_TOKEN = this.token!;

      return this.token!;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Log("backend", "error", "auth", `Token refresh failed: ${msg}`);
      throw new Error(`Token refresh failed: ${msg}`);
    }
  }
}

function nowSeconds(): number {
  return Math.floor(Date.now() / 1000);
}

export const tokenService = new TokenService();
