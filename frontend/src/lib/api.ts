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
  tagTypes: ['Claims', 'Policy', 'Users', 'Leaves'],
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
      query: (data) => ({
        url: '/auth/forgot-password/',
        method: 'POST',
        body: data,
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
      query: ({ claimData, files, fileMapping }) => {
        const formData = new FormData();
        formData.append('claimData', JSON.stringify(claimData));
        formData.append('fileMapping', JSON.stringify(fileMapping || {}));
        
        // Add files to form data
        if (files && files.length > 0) {
          files.forEach((file: File) => {
            formData.append('files', file);
          });
        }
        
        return {
          url: '/claims',
          method: 'POST',
          body: formData,
          prepareHeaders: (headers: Headers) => {
            // Remove Content-Type header to let browser set it with boundary
            headers.delete('Content-Type');
            return headers;
          },
        };
      },
      invalidatesTags: ['Claims'],
    }),
    uploadClaimFile: builder.mutation({
      query: ({ claimId, file }: {
        claimId: string;
        file: File;
      }) => {
        const formData = new FormData();
        formData.append('file', file);
        
        return {
          url: `/claims/${claimId}/upload`,
          method: 'POST',
          body: formData,
          // Don't set Content-Type header - let the browser set it with boundary
          prepareHeaders: (headers: Headers) => {
            // Remove any Content-Type header to let the browser set it correctly for FormData
            headers.delete('Content-Type');
            return headers;
          },
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
      transformResponse: (response: any) => {
        // Return the full response object with claims array and pagination info
        return response;
      },
      providesTags: ['Claims'],
    }),
    getClaimStats: builder.query({
      query: (params = {}) => ({
        url: '/claims/stats',
        params,
      }),
      transformResponse: (response: any) => response.stats || response,
      providesTags: ['Claims'],
    }),
    getClaim: builder.query({
      query: (id) => `/claims/${id}`,
      transformResponse: (response: any) => response.claim || response,
      providesTags: (result, error, id) => [{ type: 'Claims', id }],
    }),
    updateClaim: builder.mutation({
      query: ({ id, claimData, files, fileMapping, ...claim }) => {
        // If files are provided, use FormData
        if (files && files.length > 0) {
          const formData = new FormData();
          formData.append('claimData', JSON.stringify(claimData || claim));
          formData.append('fileMapping', JSON.stringify(fileMapping || {}));
          
          // Add files to form data
          files.forEach((file: File) => {
            // Only add new files (not existing ones)
            if (!(file as any).isExisting) {
              formData.append('files', file);
            }
          });
          
          return {
            url: `/claims/${id}`,
            method: 'PATCH',
            body: formData,
            prepareHeaders: (headers: Headers) => {
              headers.delete('Content-Type');
              return headers;
            },
          };
        } else {
          // No files, use regular JSON
          return {
            url: `/claims/${id}`,
            method: 'PATCH',
            body: claimData || claim,
          };
        }
      },
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
        url: `/claims/${id}/finance-approve`,
        method: 'POST',
        body: { action, notes, reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    executiveApprove: builder.mutation({
      query: ({ id, action, reason, notes }) => ({
        url: `/claims/${id}/executive-approve`,
        method: 'POST',
        body: { action, notes, reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Claims', id },
        'Claims',
      ],
    }),
    markPaid: builder.mutation({
      query: ({ id, channel, reference }) => ({
        url: `/claims/${id}/mark-paid`,
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

    // Leaves
    createLeave: builder.mutation({
      query: (leave) => ({
        url: '/leaves',
        method: 'POST',
        body: leave,
      }),
      invalidatesTags: ['Leaves'],
    }),
    createBulkLeaves: builder.mutation({
      query: (leaves) => ({
        url: '/leaves/bulk',
        method: 'POST',
        body: { leaves },
      }),
      invalidatesTags: ['Leaves'],
    }),
    getLeaves: builder.query({
      query: (params = {}) => ({
        url: '/leaves',
        params,
      }),
      transformResponse: (response: any) => response,
      providesTags: ['Leaves'],
    }),
    getPendingLeaves: builder.query({
      query: (params = {}) => ({
        url: '/leaves/pending',
        params,
      }),
      transformResponse: (response: any) => response,
      providesTags: ['Leaves'],
    }),
    getLeaveAnalytics: builder.query({
      query: (params = {}) => ({
        url: '/leaves/analytics',
        params,
      }),
      transformResponse: (response: any) => response,
      providesTags: ['Leaves'],
    }),
    getTodayLeaves: builder.query({
      query: () => '/leaves/today',
      transformResponse: (response: any) => response,
      providesTags: ['Leaves'],
    }),
    getLeavesByDateRange: builder.query({
      query: ({ startDate, endDate }) => ({
        url: '/leaves/by-date-range',
        params: { startDate, endDate },
      }),
      transformResponse: (response: any) => response,
      providesTags: ['Leaves'],
    }),
    updateLeave: builder.mutation({
      query: ({ id, ...leave }) => ({
        url: `/leaves/${id}`,
        method: 'PUT',
        body: leave,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leaves', id },
        'Leaves',
      ],
    }),
    approveLeave: builder.mutation({
      query: ({ id, action, notes, rejectionReason }) => ({
        url: `/leaves/${id}/approve`,
        method: 'POST',
        body: { action, notes, rejectionReason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Leaves', id },
        'Leaves',
      ],
    }),
    deleteLeave: builder.mutation({
      query: (id: string) => ({
        url: `/leaves/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Leaves', id },
        'Leaves',
      ],
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
    deactivateUser: builder.mutation({
      query: (id: string) => ({
        url: `/users/${id}/deactivate`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Users'],
    }),
    resetUserPassword: builder.mutation({
      query: ({ id, password }) => ({
        url: `/users/${id}/reset-password`,
        method: 'PATCH',
        body: { password },
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

    // Get employee names for filtering
    getEmployeeNames: builder.query({
      query: () => '/users/employee-names',
      providesTags: ['Users'],
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
  useUploadClaimFileMutation,
  useGetClaimsQuery,
  useGetClaimQuery,
  useUpdateClaimMutation,
  useApproveClaimMutation,
  useFinanceApproveMutation,
  useExecutiveApproveMutation,
  useMarkPaidMutation,
  useDeleteClaimMutation,
  useGetClaimStatsQuery,

  // Users
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useResetUserPasswordMutation,
  useDeleteUserMutation,
      // Leaves
    useCreateLeaveMutation,
    useCreateBulkLeavesMutation,
    useGetLeavesQuery,
    useGetPendingLeavesQuery,
    useGetLeaveAnalyticsQuery,
    useGetTodayLeavesQuery,
    useGetLeavesByDateRangeQuery,
    useUpdateLeaveMutation,
    useApproveLeaveMutation,
    useDeleteLeaveMutation,
    useGetEmployeeNamesQuery,
} = api;
