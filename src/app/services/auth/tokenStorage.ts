const ACCESS_TOKEN_KEY = "attendance.auth.accessToken";
const REFRESH_TOKEN_KEY = "attendance.auth.refreshToken";

const canUseStorage = () => typeof window !== "undefined" && !!window.localStorage;

export const tokenStorage = {
  getTokens(): { accessToken: string | null; refreshToken: string | null } {
    if (!canUseStorage()) {
      return { accessToken: null, refreshToken: null };
    }
    return {
      accessToken: window.localStorage.getItem(ACCESS_TOKEN_KEY),
      refreshToken: window.localStorage.getItem(REFRESH_TOKEN_KEY),
    };
  },
  setTokens(accessToken: string | null, refreshToken: string | null) {
    if (!canUseStorage()) return;
    if (accessToken) {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    } else {
      window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
    if (refreshToken) {
      window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    } else {
      window.localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  },
  clearTokens() {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};

