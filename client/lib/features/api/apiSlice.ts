import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";
import { logout, setCredentials } from "../auth/authSlice";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
  credentials: "include",
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.accessToken;
    if (token) {
      headers.set("authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions
) => {
  let result = await baseQuery(args, api, extraOptions);

  // If unauthorized, try to refresh
  const isRefresh = (typeof args === "string" ? args : args.url).includes("/auth/refresh");

  if (result.error && (result.error.status === 401 || result.error.status === 403) && !isRefresh) {
    const refreshResult: any = await baseQuery(
      {
        url: "/auth/refresh",
        method: "POST",
      },
      api,
      extraOptions
    );

    if (refreshResult.data && refreshResult.data.success) {
      const { accessToken, admin, venue_id } = refreshResult.data;
      
      // Update store with new access token
      api.dispatch(setCredentials({ 
          accessToken, 
          admin: admin || (api.getState() as any).auth.admin, 
          venue_id: venue_id || (api.getState() as any).auth.venue_id 
      }));

      // Retry original request with new token (prepareHeaders will pick it up)
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed or revoked
      api.dispatch(logout());
      // Only redirect on client side
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  }
  return result;
};

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Staff", "Guest", "Crisis"],
  endpoints: (builder) => ({}),
});
