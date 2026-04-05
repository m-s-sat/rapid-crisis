import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query";

const baseQuery = fetchBaseQuery({
  baseUrl: "/api",
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

  if (result.error && result.error.status === 403) {
    const refreshToken = (api.getState() as any).auth.refreshToken;
    if (refreshToken) {
      const refreshResult: any = await baseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { token: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        api.dispatch({ type: "auth/setTokens", payload: refreshResult.data });
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch({ type: "auth/logout" });
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
