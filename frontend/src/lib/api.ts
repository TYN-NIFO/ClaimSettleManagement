import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any

const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as { auth: { accessToken: string } }).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && (result.error as { status: number }).status === 401) {
    // Try to get a new token
    const refreshResult = await baseQuery('/auth/refresh', api, extraOptions);
    if (refreshResult.data) {
      // Store the new token
      api.dispatch({ type: 'auth/setTokens', payload: refreshResult.data });
      // Retry the original request
      result = await baseQuery(args, api, extraOptions);
    } else {
      api.dispatch({ type: 'auth/logout' });
    }
  }

  return result;
};

export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['User', 'Claim', 'Policy'],
  endpoints: (builder) => ({
    // Auth endpoints
    login: builder.mutation({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),
    refresh: builder.mutation({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
      }),
    }),

    // User endpoints
    getUsers: builder.query({
      query: (params) => ({
        url: '/users',
        params,
      }),
      providesTags: ['User'],
    }),
    getUser: builder.query({
      query: (id) => `/users/${id}`,
      providesTags: (result, error, id) => [{ type: 'User', id }],
    }),
    createUser: builder.mutation({
      query: (userData) => ({
        url: '/users',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...userData }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: userData,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'User', id }],
    }),
    deactivateUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['User'],
    }),
    resetPassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/users/${id}/reset-password`,
        method: 'PATCH',
        body: { password },
      }),
    }),
    getSupervisors: builder.query({
      query: () => '/users/supervisors',
    }),

    // Claim endpoints
    getClaims: builder.query({
      query: (params) => ({
        url: '/claims',
        params,
      }),
      providesTags: ['Claim'],
    }),
    getClaim: builder.query({
      query: (id) => `/claims/${id}`,
      providesTags: (result, error, id) => [{ type: 'Claim', id }],
    }),
    createClaim: builder.mutation({
      query: (claimData) => ({
        url: '/claims',
        method: 'POST',
        body: claimData,
      }),
      invalidatesTags: ['Claim'],
    }),
    approveClaim: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/claims/${id}/approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Claim', id }],
    }),
    financeApprove: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/claims/${id}/finance-approve`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Claim', id }],
    }),
    markAsPaid: builder.mutation({
      query: ({ id, ...data }) => ({
        url: `/claims/${id}/mark-paid`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Claim', id }],
    }),
    uploadAttachment: builder.mutation({
      query: ({ id, file }) => {
        const formData = new FormData();
        formData.append('file', file);
        return {
          url: `/claims/${id}/upload`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (result, error, { id }) => [{ type: 'Claim', id }],
    }),
    getClaimStats: builder.query({
      query: () => '/claims/stats',
    }),

    // Policy endpoints
    getPolicy: builder.query({
      query: () => '/policies',
      providesTags: ['Policy'],
    }),
    updatePolicy: builder.mutation({
      query: (policyData) => ({
        url: '/policies',
        method: 'PATCH',
        body: policyData,
      }),
      invalidatesTags: ['Policy'],
    }),
  }),
});

export const {
  useLoginMutation,
  useLogoutMutation,
  useRefreshMutation,
  useGetUsersQuery,
  useGetUserQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useResetPasswordMutation,
  useGetSupervisorsQuery,
  useGetClaimsQuery,
  useGetClaimQuery,
  useCreateClaimMutation,
  useApproveClaimMutation,
  useFinanceApproveMutation,
  useMarkAsPaidMutation,
  useUploadAttachmentMutation,
  useGetClaimStatsQuery,
  useGetPolicyQuery,
  useUpdatePolicyMutation,
} = api;
