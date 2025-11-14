"use client";

interface EmailChangeSession {
  newEmail: string;
  requestedAt: number;
  step: "verify";
}

const SESSION_KEY = "emailChangeSession";
const SESSION_EXPIRY = 10 * 60 * 1000; // 10 minutes

export class EmailChangeSessionService {
  // Save session when OTP is sent
  static save(newEmail: string): void {
    const session: EmailChangeSession = {
      newEmail,
      requestedAt: Date.now(),
      step: "verify",
    };

    if (typeof window !== "undefined") {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  // Get session if valid
  static get(): EmailChangeSession | null {
    if (typeof window === "undefined") return null;

    const data = sessionStorage.getItem(SESSION_KEY);
    if (!data) return null;

    try {
      const session: EmailChangeSession = JSON.parse(data);

      // Check expiry
      if (Date.now() - session.requestedAt > SESSION_EXPIRY) {
        this.clear();
        return null;
      }

      return session;
    } catch {
      this.clear();
      return null;
    }
  }

  // Check if session is valid
  static isValid(): boolean {
    return this.get() !== null;
  }

  // Get remaining time in seconds
  static getRemainingTime(): number {
    const session = this.get();
    if (!session) return 0;

    const elapsed = Date.now() - session.requestedAt;
    const remaining = SESSION_EXPIRY - elapsed;
    return Math.max(0, Math.floor(remaining / 1000));
  }

  // Clear session
  static clear(): void {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem(SESSION_KEY);
    }
  }
}
