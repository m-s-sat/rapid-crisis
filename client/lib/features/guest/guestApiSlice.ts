import { apiSlice } from "../api/apiSlice";

export const guestApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getGuests: builder.query({
      query: ({ page = 1, limit = 10, status }) => ({
        url: "guests",
        params: { page, limit, status },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.guests.map(({ _id }: any) => ({ type: "Guest" as const, id: _id })),
              { type: "Guest", id: "LIST" },
            ]
          : [{ type: "Guest", id: "LIST" }],
    }),
    createGuest: builder.mutation({
      query: (guestData) => ({
        url: "guests",
        method: "POST",
        body: guestData,
      }),
      invalidatesTags: [{ type: "Guest", id: "LIST" }],
    }),
    checkOutGuest: builder.mutation({
      query: (id) => ({
        url: `guests/${id}/checkout`,
        method: "PATCH",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Guest", id }],
    }),
  }),
});

export const { useGetGuestsQuery, useCreateGuestMutation, useCheckOutGuestMutation } = guestApiSlice;
