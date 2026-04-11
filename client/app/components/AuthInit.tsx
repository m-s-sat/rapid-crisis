"use client";

import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setCredentials, setLoading, logout } from "../../lib/features/auth/authSlice";

export default function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include", 
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            dispatch(setCredentials({ 
                admin: data.admin, 
                venue_id: data.venue_id, 
                accessToken: data.accessToken 
            }));
          } else {
            dispatch(logout());
          }
        } else {
          dispatch(logout());
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        dispatch(logout());
      } finally {
        dispatch(setLoading(false));
      }
    };

    checkAuth();
  }, [dispatch]);

  return <>{children}</>;
}
