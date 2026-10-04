import { ok, handle } from './result.js';

export function registerPolicyTools(server, { api }) {
  server.registerTool(
    'get_company_policy',
    {
      description: 'Retrieve the active company expense policy, including allowed categories, spending caps, approval rules, and payout channels.'
    },
    handle('Failed to fetch policy', async () => {
      const response = await api.request('/api/policy/current');
      const policy = response.policy || response;

      return ok([
        `📋 Company Expense Policy (Version: ${policy.version || 'v1.0'})`,
        `-------------------------------------------------------`,
        `Approval Mode: ${policy.approvalMode === 'both' ? 'Requires both Supervisor and Finance approvals' : 'Requires either Supervisor or Finance approval'}`,
        `Finance Manager Threshold: ₹${policy.maxAmountBeforeFinanceManager?.toLocaleString() || '10,000'} (Claims above this require finance manager review)`,
        `Mileage Rate: ₹${policy.mileageRate || 12}/km`,
        `Allowed Receipt File Types: ${(policy.allowedFileTypes || ['pdf', 'jpg', 'png']).join(', ')} (Max size: ${policy.maxFileSizeMB || 10}MB)`,
        `Payout Channels: ${(policy.payoutChannels || ['Bank Transfer', 'Cash', 'Check']).join(', ')}`,
        ``,
        `Allowed Expense Categories:`,
        ...(policy.claimCategories || []).map(cat => `  • ${cat}`)
      ].join('\n'));
    })
  );
}
