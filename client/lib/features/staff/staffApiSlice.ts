import { apiSlice } from "../api/apiSlice";

export const staffApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getStaff: builder.query({
      query: ({ page = 1, limit = 10, expertise }) => ({
        url: "staff",
        params: { page, limit, expertise },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.staff.map(({ _id }: any) => ({ type: "Staff" as const, id: _id })),
              { type: "Staff", id: "LIST" },
            ]
          : [{ type: "Staff", id: "LIST" }],
    }),
    createStaff: builder.mutation({
      query: (staffData) => ({
        url: "staff",
        method: "POST",
        body: staffData,
      }),
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
    deleteStaff: builder.mutation({
      query: (id) => ({
        url: `staff/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, id) => [{ type: "Staff", id }],
    }),
  }),
});

export const { useGetStaffQuery, useCreateStaffMutation, useDeleteStaffMutation } = staffApiSlice;
