import { ok } from './result.js';

const ROLE_PERMISSIONS = {
  employee: 'Can submit, view, and track own claims; view company expense policies.',
  supervisor: 'Can submit claims and view claims of assigned team members.',
  finance_manager: 'Can approve claims, settle/mark claims as paid, view all claims, and view analytics.',
  executive: 'Can view all claims and analytics.',
  admin: 'Full system access (all claims, users, policies, audit logs).'
};

export function registerSessionTools(server, { user }) {
  server.registerTool(
    'get_current_user',
    {
      description: 'Show who is signed in to this MCP connection and what their role allows.'
    },
    async () => ok([
      'Current Session:',
      `- Name: ${user.name}`,
      `- Email: ${user.email}`,
      `- Role: ${user.role}`,
      `- Department: ${user.department || 'N/A'}`,
      `- User ID: ${user._id}`,
      `- Permissions: ${ROLE_PERMISSIONS[user.role] || user.role}`
    ].join('\n'))
  );
}
