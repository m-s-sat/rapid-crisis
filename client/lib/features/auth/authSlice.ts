import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getCookie, setCookie, removeCookie } from "../../utils/cookies";

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  admin: { name: string; email: string } | null;
  venue_id: string | null;
}

// Helper to safely access storage in Next.js
const getStoredAuth = () => {
  if (typeof window === "undefined") return null;
  
  const accessToken = getCookie("sentinel_access_token");
  const refreshToken = getCookie("sentinel_refresh_token");
  const storedUser = localStorage.getItem("sentinel_user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  return {
    accessToken,
    refreshToken,
    admin: user?.admin || null,
    venue_id: user?.venue_id || null,
  };
};

const stored = getStoredAuth();

const initialState: AuthState = {
  accessToken: stored?.accessToken || null,
  refreshToken: stored?.refreshToken || null,
  admin: stored?.admin || null,
  venue_id: stored?.venue_id || null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken: string; admin: any; venue_id: string }>
    ) => {
      const { accessToken, refreshToken, admin, venue_id } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.admin = admin;
      state.venue_id = venue_id;
      
      if (typeof window !== "undefined") {
        setCookie("sentinel_access_token", accessToken);
        setCookie("sentinel_refresh_token", refreshToken);
        localStorage.setItem("sentinel_user", JSON.stringify({ admin, venue_id }));
      }
    },
    setTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      
      if (typeof window !== "undefined") {
        setCookie("sentinel_access_token", action.payload.accessToken);
        setCookie("sentinel_refresh_token", action.payload.refreshToken);
      }
    },
    logout: (state) => {
      state.accessToken = null;
      state.refreshToken = null;
      state.admin = null;
      state.venue_id = null;
      
      if (typeof window !== "undefined") {
        removeCookie("sentinel_access_token");
        removeCookie("sentinel_refresh_token");
        localStorage.removeItem("sentinel_user");
      }
    },
  },
});

export const { setCredentials, setTokens, logout } = authSlice.actions;
export default authSlice;
