import { apiSlice } from "../api/apiSlice";

export const authApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation({
      query: (credentials) => ({
        url: "/auth/login",
        method: "POST",
        body: { ...credentials },
      }),
    }),
    register: builder.mutation({
      query: (userData) => ({
        url: "/auth/register",
        method: "POST",
        body: { ...userData },
      }),
    }),
    refresh: builder.mutation({
      query: (token) => ({
        url: "/auth/refresh",
        method: "POST",
        body: { token },
      }),
    }),
  }),
});

export const { useLoginMutation, useRegisterMutation, useRefreshMutation } = authApiSlice;
