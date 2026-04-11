"use client";

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useRefreshMutation } from "../../lib/features/auth/authApiSlice";
import { setCredentials, setInitialized } from "../../lib/features/auth/authSlice";
import { Loader2 } from "lucide-react";

export default function AuthInit({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch();
  const { isInitialized, accessToken } = useSelector((state: any) => state.auth);
  const [refresh, { isLoading }] = useRefreshMutation();
  const [isRefreshing, setIsRefreshing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // If we already have an accessToken (e.g. from login), we are good
      if (accessToken) {
        dispatch(setInitialized(true));
        setIsRefreshing(false);
        return;
      }

      try {
        // Attempt to refresh the token using the HttpOnly cookie
        const result = await refresh({}).unwrap();
        if (result.accessToken) {
          dispatch(setCredentials({
            admin: result.admin,
            venue_id: result.venue_id,
            accessToken: result.accessToken
          }));
        }
      } catch (err) {
        console.log("[AUTH-INIT] No active session found.");
      } finally {
        dispatch(setInitialized(true));
        setIsRefreshing(false);
      }
    };

    initAuth();
  }, [dispatch, refresh, accessToken]);

  if (isRefreshing || !isInitialized) {
    return (
      <div className="flex flex-col items-center justify-center fixed inset-0 z-[100] bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" />
            <Loader2 className="h-12 w-12 animate-spin text-primary absolute inset-0" style={{ animationDuration: '3s' }} />
          </div>
          <div className="text-center">
            <h2 className="headline text-xl font-bold tracking-widest text-primary animate-pulse">
              SENTINEL OS
            </h2>
            <p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted-foreground mt-1">
              Initializing Secure Session...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
