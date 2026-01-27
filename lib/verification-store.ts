// Shared in-memory store for verification codes
// In production, use Redis or a database for persistence across server restarts

interface VerificationData {
  code: string;
  expires: number;
  password: string;
}

class VerificationStore {
  private codes = new Map<string, VerificationData>();

  // Store a verification code
  set(email: string, data: VerificationData) {
    this.codes.set(email, data);
    console.log(`📝 Stored verification code for ${email}: ${data.code}`);
  }

  // Get verification data
  get(email: string): VerificationData | undefined {
    return this.codes.get(email);
  }

  // Delete verification data
  delete(email: string) {
    this.codes.delete(email);
    console.log(`🗑️ Deleted verification code for ${email}`);
  }

  // Clean up expired codes
  cleanup() {
    const now = Date.now();
    const emailsToDelete: string[] = [];

    this.codes.forEach((data, email) => {
      if (now > data.expires) {
        emailsToDelete.push(email);
      }
    });

    emailsToDelete.forEach(email => {
      this.codes.delete(email);
      console.log(`🧹 Cleaned up expired code for ${email}`);
    });
  }

  // Get all codes (for debugging)
  getAll() {
    return Object.fromEntries(this.codes);
  }
}

// Export a singleton instance
export const verificationStore = new VerificationStore();

// Clean up expired codes every 5 minutes
setInterval(() => {
  verificationStore.cleanup();
}, 5 * 60 * 1000);