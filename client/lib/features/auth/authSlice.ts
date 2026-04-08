import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { getCookie, setCookie, removeCookie } from "../../utils/cookies";

interface AuthState {
  admin: { name: string; email: string } | null;
  venue_id: string | null;
  accessToken: string | null;
  isLoading: boolean;
}

// Helper to safely access storage in Next.js
const getStoredAuth = () => {
  if (typeof window === "undefined") return null;
  
  const storedUser = localStorage.getItem("sentinel_user");
  const user = storedUser ? JSON.parse(storedUser) : null;

  return {
    admin: user?.admin || null,
    venue_id: user?.venue_id || null,
  };
};

const stored = getStoredAuth();

const initialState: AuthState = {
  admin: stored?.admin || null,
  venue_id: stored?.venue_id || null,
  accessToken: null, // Keep in memory only
  isLoading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ admin: any; venue_id: string; accessToken: string }>
    ) => {
      const { admin, venue_id, accessToken } = action.payload;
      state.admin = admin;
      state.venue_id = venue_id;
      state.accessToken = accessToken;
      state.isLoading = false;
      
      if (typeof window !== "undefined") {
        localStorage.setItem("sentinel_user", JSON.stringify({ admin, venue_id }));
      }
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.admin = null;
      state.venue_id = null;
      state.accessToken = null;
      state.isLoading = false;
      
      if (typeof window !== "undefined") {
        localStorage.removeItem("sentinel_user");
      }
    },
  },
});

export const { setCredentials, setLoading, logout } = authSlice.actions;
export default authSlice;
