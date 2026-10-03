import { z } from 'zod';

export function registerAuthTools(server, apiClient) {
  // Login tool
  server.tool(
    'login',
    'Authenticate to the Claim Settlement system using your email and password. Establishes your session and role permissions.',
    {
      email: z.string().email().describe('Your account email address'),
      password: z.string().describe('Your account password')
    },
    async ({ email, password }) => {
      try {
        const result = await apiClient.login(email, password);
        const user = result.user;
        const roleDesc = {
          employee: 'Can submit, view, and track own claims; view company expense policies.',
          supervisor: 'Can submit claims and review/approve claims for assigned team members.',
          finance_manager: 'Can approve claims, settle/mark claims as paid, view all claims, and view analytics.',
          admin: 'Full system access (all claims, users, policies, audit logs).'
        }[user.role] || user.role;

        return {
          content: [{
            type: 'text',
            text: `✅ Successfully authenticated!\n\nUser: ${user.name} (${user.email})\nRole: ${user.role.toUpperCase()}\nDepartment: ${user.department || 'N/A'}\nPermissions: ${roleDesc}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Authentication failed: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // Logout tool
  server.tool(
    'logout',
    'Log out of the current Claim Settlement session and clear stored credentials.',
    {},
    async () => {
      apiClient.logout();
      return {
        content: [{
          type: 'text',
          text: '✅ Successfully logged out. Please call login to perform further actions.'
        }]
      };
    }
  );

  // Get current user session
  server.tool(
    'get_current_user',
    'Check who is currently authenticated and view active role permissions.',
    {},
    async () => {
      if (!apiClient.isAuthenticated) {
        return {
          content: [{
            type: 'text',
            text: '⚠️ No active session. You are currently not logged in. Use the "login" tool to authenticate.'
          }]
        };
      }

      try {
        const user = apiClient.user || await apiClient.getProfile();
        return {
          content: [{
            type: 'text',
            text: `Current Session:\n- Name: ${user.name}\n- Email: ${user.email}\n- Role: ${user.role}\n- Department: ${user.department || 'N/A'}\n- User ID: ${user._id || user.id}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to fetch profile: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
