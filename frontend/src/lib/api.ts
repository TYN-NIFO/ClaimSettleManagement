import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from './store';

// Base query with authentication
const baseQuery = fetchBaseQuery({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

// Base query with re-authentication
const baseQueryWithReauth = async (args: any, api: any, extraOptions: any) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && (result.error.status === 401 || result.error.status === 403)) {
    // Try to refresh the token
    const refreshResult = await baseQuery(
      {
        url: '/auth/refresh/',
        method: 'POST',
      },
      api,
      extraOptions
    );

    if (refreshResult.data) {
      // Store the new token
      api.dispatch({
        type: 'auth/setTokens',
        payload: refreshResult.data,
      });

      // Retry the original request
      result = await baseQuery(args, api, extraOptions);
    } else {
      // Refresh failed, logout
      api.dispatch({ type: 'auth/logout' });
      // Force redirect to login with return URL so user can continue afterwards
      if (typeof window !== 'undefined') {
        const next = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/login?next=${next}`;
      }
    }
  }

  return result;
};

export const api = createApi({
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Claims', 'Policy', 'Users'],
  endpoints: (builder) => ({
    // Authentication
    token: builder.mutation({
      query: (credentials) => ({
        url: '/auth/token/',
        method: 'POST',
        body: credentials,
      }),
    }),
    refresh: builder.mutation({
      query: () => ({
        url: '/auth/refresh/',
        method: 'POST',
      }),
    }),
    logout: builder.mutation({
      query: () => ({
        url: '/auth/logout/',
        method: 'POST',
      }),
    }),
    getProfile: builder.query({
      query: () => '/auth/me/',
    }),
    updateProfile: builder.mutation({
      query: (profile) => ({
        url: '/auth/me/',
        method: 'PATCH',
        body: profile,
      }),
    }),
    uploadAvatar: builder.mutation({
      query: (file: File) => {
        const formData = new FormData();
        formData.append('avatar', file);
        return {
          url: '/auth/avatar/',
          method: 'POST',
          body: formData,
        };
      },
    }),
    checkUsername: builder.mutation({
      query: (email) => ({
        url: '/auth/check-username/',
        method: 'POST',
        body: { email },
      }),
    }),
    changePassword: builder.mutation({
      query: (passwords) => ({
        url: '/auth/change-password/',
        method: 'POST',
        body: passwords,
      }),
    }),
    forgotPassword: builder.mutation({
      query: (email) => ({
        url: '/auth/forgot-password/',
        method: 'POST',
        body: { email },
      }),
    }),
    resetPassword: builder.mutation({
      query: (data) => ({
        url: '/auth/reset-password/',
        method: 'POST',
        body: data,
      }),
    }),

    // Policy
    getPolicy: builder.query({
      query: () => '/policy/current',
      providesTags: ['Policy'],
    }),
    updatePolicy: builder.mutation({
      query: (policy) => ({
        url: '/policy',
        method: 'PUT',
        body: policy,
      }),
      invalidatesTags: ['Policy'],
    }),
    getPolicyHistory: builder.query({
      query: () => '/policy/history',
      providesTags: ['Policy'],
    }),

    // Claims
    createClaim: builder.mutation({
      query: (claim) => ({
        url: '/claims',
        method: 'POST',
        body: claim,
      }),
      invalidatesTags: ['Claims', 'Stats'],
    }),
    uploadClaimFiles: builder.mutation({
      query: ({ claimId, lineItemId, files, labels }: {
        claimId: string;
        lineItemId: string;
        files: File[];
        labels: string[];
      }) => {
        const formData = new FormData();
        formData.append('lineItemId', lineItemId);
        formData.append('labels', JSON.stringify(labels));
        
        files.forEach((file: File) => {
          formData.append('files', file);
        });

        return {
          url: `/claims/${claimId}/files`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: ['Claims'],
    }),
    getClaims: builder.query({
      query: (params = {}) => ({
        url: '/claims',
        params: {
          limit: 50, // Increase default limit from 20 to 50
          ...params
        },
      }),
      transformResponse: (response: any) => response.claims ? { ...response, claims: response.claims } : response,
      providesTags: ['Claims'],
    }),
    getClaimStats: builder.query({
      query: (params = {}) => ({
        url: '/claims/stats',
        params,
      }),
      transformResponse: (response: any) => response.stats || response,
      providesTags: ['Claims', 'Stats'],
    }),
    getClaim: builder.query({
      query: (id) => `/claims/${id}`,
      transformResponse: (response: any) => response.claim || response,
      providesTags: (result, error, id) => [{ type: 'Claims', id }],
    }),
    updateClaim: builder.mutation({
      query: ({ id, ...claim }) => ({
        url: `/claims/${id}`,
        method: 'PATCH',
        body: claim,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    approveClaim: builder.mutation({
      query: ({ id, action, reason, notes }) => ({
        url: `/claims/${id}/approve`,
        method: 'POST',
        body: { action, reason, notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    financeApprove: builder.mutation({
      query: ({ id, action, reason, notes }) => ({
        url: `/claims/${id}/finance`,
        method: 'POST',
        body: { action, reason, notes },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    markPaid: builder.mutation({
      query: ({ id, channel, reference }) => ({
        url: `/claims/${id}/pay`,
        method: 'POST',
        body: { channel, reference },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    deleteClaim: builder.mutation({
      query: (id) => ({
        url: `/claims/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Claims'],
    }),

    // Users (Admin only)
    getUsers: builder.query({
      query: (params = {}) => ({
        url: '/users',
        params,
      }),
      providesTags: ['Users'],
    }),
    createUser: builder.mutation({
      query: (user) => ({
        url: '/users',
        method: 'POST',
        body: user,
      }),
      invalidatesTags: ['Users'],
    }),
    updateUser: builder.mutation({
      query: ({ id, ...user }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: user,
      }),
      invalidatesTags: ['Users'],
    }),
    deleteUser: builder.mutation({
      query: (id) => ({
        url: `/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Users'],
    }),
    resetUserPassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/users/${id}/reset-password`,
        method: 'POST',
        body: { password },
      }),
      invalidatesTags: ['Users'],
    }),
  }),
});

export const {
  // Authentication
  useTokenMutation,
  useRefreshMutation,
  useLogoutMutation,
  useGetProfileQuery,
  useUpdateProfileMutation,
  useUploadAvatarMutation,
  useCheckUsernameMutation,
  useChangePasswordMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,

  // Policy
  useGetPolicyQuery,
  useUpdatePolicyMutation,
  useGetPolicyHistoryQuery,

  // Claims
  useCreateClaimMutation,
  useUploadClaimFilesMutation,
  useGetClaimsQuery,
  useGetClaimQuery,
  useUpdateClaimMutation,
  useApproveClaimMutation,
  useFinanceApproveMutation,
  useMarkPaidMutation,
  useDeleteClaimMutation,
  useGetClaimStatsQuery,

  // Users
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useResetUserPasswordMutation,
} = api;
