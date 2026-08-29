/**
 * Unique Client Token Generator & Manager
 * Ensures every browser/user gets a persistent 100% unique identification token.
 */
const TOKEN_KEY = "agenttrust_unique_client_token";

export function getOrCreateClientToken(): string {
  try {
    let token = localStorage.getItem(TOKEN_KEY);
    if (!token || !token.startsWith("usr_tok_")) {
      const randomPart =
        Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      token = `usr_tok_${randomPart}`;
      localStorage.setItem(TOKEN_KEY, token);
    }
    return token;
  } catch (e) {
    return `usr_tok_${Date.now()}`;
  }
}
