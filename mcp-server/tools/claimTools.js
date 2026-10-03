import { z } from 'zod';

export function registerClaimTools(server, apiClient) {
  // 1. Submit a new expense claim
  server.tool(
    'submit_claim',
    'Submit a new expense claim with line items and optional receipt files. Validates against active company policy.',
    {
      businessUnit: z.enum(['Alliance', 'Coinnovation', 'General']).describe('Business unit'),
      category: z.string().describe('Expense category (e.g., "Travel & Lodging", "Office & Admin", "Client Entertainment & Business Meals")'),
      lineItems: z.array(z.object({
        date: z.string().describe('Date of expense in YYYY-MM-DD format'),
        subCategory: z.string().describe('Sub-category (e.g., "Hotel", "Flight", "Meals", "Supplies")'),
        description: z.string().describe('Detailed description or business purpose of the expense'),
        amount: z.number().positive().describe('Expense amount'),
        currency: z.enum(['INR', 'USD', 'EUR']).default('INR').describe('Currency (defaults to INR)'),
        gstTotal: z.number().min(0).default(0).describe('GST or tax amount if applicable')
      })).min(1).describe('List of expense line items'),
      filePaths: z.array(z.string()).optional().describe('Optional list of absolute paths to receipt files on disk (PDF, JPG, PNG)')
    },
    async ({ businessUnit, category, lineItems, filePaths = [] }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{
              type: 'text',
              text: '⚠️ You must log in first before submitting a claim. Use the "login" tool.'
            }],
            isError: true
          };
        }

        // Format line items ensuring amountInINR is calculated
        const formattedLineItems = lineItems.map(item => ({
          ...item,
          amountInINR: item.amountInINR || item.amount,
          gstTotal: item.gstTotal || 0,
          currency: item.currency || 'INR'
        }));

        const claimData = {
          businessUnit,
          category,
          lineItems: formattedLineItems
        };

        const result = await apiClient.submitClaim({ claimData, filePaths });
        const claim = result.claim || result;

        const totalAmt = claim.grandTotal || claim.amount || formattedLineItems.reduce((acc, i) => acc + i.amount, 0);

        return {
          content: [{
            type: 'text',
            text: [
              `🎉 Claim submitted successfully!`,
              `-----------------------------------------`,
              `Claim ID: ${claim.claimId || claim._id}`,
              `Category: ${claim.category}`,
              `Business Unit: ${claim.businessUnit}`,
              `Status: ${claim.status ? claim.status.toUpperCase() : 'SUBMITTED'}`,
              `Grand Total: ₹${totalAmt.toLocaleString()}`,
              `Line Items Count: ${formattedLineItems.length}`,
              `Attachments: ${filePaths.length} file(s) attached`
            ].join('\n')
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `❌ Failed to submit claim: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 2. List own claims
  server.tool(
    'list_my_claims',
    'List claims submitted by the current user. Supports filtering by status and category.',
    {
      status: z.enum(['submitted', 'approved', 'finance_approved', 'paid', 'rejected']).optional().describe('Filter by status'),
      category: z.string().optional().describe('Filter by category'),
      page: z.number().int().min(1).default(1).describe('Page number (default: 1)'),
      limit: z.number().int().min(1).max(100).default(10).describe('Items per page (default: 10)')
    },
    async ({ status, category, page = 1, limit = 10 }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{
              type: 'text',
              text: '⚠️ You must log in first. Use the "login" tool.'
            }],
            isError: true
          };
        }

        const query = new URLSearchParams();
        if (status) query.set('status', status);
        if (category) query.set('category', category);
        query.set('page', String(page));
        query.set('limit', String(limit));

        const res = await apiClient.request(`/api/claims?${query.toString()}`);
        const claims = res.claims || (Array.isArray(res) ? res : []);

        if (claims.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No claims found matching your criteria.'
            }]
          };
        }

        const formatted = claims.map((c, index) => {
          const id = c.claimId || c._id;
          const amt = c.grandTotal || c.amount || 0;
          const date = c.createdAt ? new Date(c.createdAt).toLocaleDateString() : 'N/A';
          return `${index + 1}. [${c.status.toUpperCase()}] ID: ${id} | ₹${amt.toLocaleString()} | Category: ${c.category} | Date: ${date} | BU: ${c.businessUnit}`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `Found ${claims.length} claim(s):\n\n${formatted}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to list claims: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 3. Get claim details
  server.tool(
    'get_claim_details',
    'Get full breakdown of a claim by its ID, including line items, attachments, approval status, and settlement details.',
    {
      claimId: z.string().describe('The Mongo ObjectId or unique claim ID sequence')
    },
    async ({ claimId }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{
              type: 'text',
              text: '⚠️ Please log in first.'
            }],
            isError: true
          };
        }

        const res = await apiClient.request(`/api/claims/${claimId}`);
        const claim = res.claim || res;

        const lines = [
          `📄 Claim Details: ${claim.claimId || claim._id}`,
          `=========================================`,
          `Status: ${claim.status.toUpperCase()}`,
          `Employee: ${claim.employeeId?.name || 'N/A'} (${claim.employeeId?.email || 'N/A'})`,
          `Business Unit: ${claim.businessUnit}`,
          `Category: ${claim.category}`,
          `Grand Total: ₹${(claim.grandTotal || claim.amount || 0).toLocaleString()}`,
          `Net Payable: ₹${(claim.netPayable || claim.grandTotal || 0).toLocaleString()}`,
          `Created At: ${claim.createdAt ? new Date(claim.createdAt).toLocaleString() : 'N/A'}`,
          ``,
          `Line Items (${(claim.lineItems || []).length}):`
        ];

        (claim.lineItems || []).forEach((item, i) => {
          const itemDate = item.date ? new Date(item.date).toLocaleDateString() : 'N/A';
          lines.push(`  ${i + 1}. [${itemDate}] ${item.subCategory}: ${item.description}`);
          lines.push(`     Amount: ₹${item.amountInINR || item.amount} (GST: ₹${item.gstTotal || 0})`);
          if (item.attachments && item.attachments.length > 0) {
            lines.push(`     Receipts: ${item.attachments.map(a => a.name || a.url).join(', ')}`);
          }
        });

        lines.push('');
        lines.push('Approval & Settlement Status:');
        lines.push(`- Finance Approval: ${claim.financeApproval?.status || 'Pending'}`);
        if (claim.financeApproval?.approvedBy) {
          lines.push(`  ↳ Approved by: ${claim.financeApproval.approvedBy.name || claim.financeApproval.approvedBy} at ${claim.financeApproval.approvedAt}`);
        }
        if (claim.payment?.paidBy) {
          lines.push(`- Payment: PAID via ${claim.payment.channel} on ${new Date(claim.payment.paidAt).toLocaleDateString()}`);
        } else {
          lines.push(`- Payment: Unpaid`);
        }

        return {
          content: [{
            type: 'text',
            text: lines.join('\n')
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to fetch claim details: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 4. Supervisor Review Claim (approve / reject)
  server.tool(
    'supervisor_review_claim',
    'Review a team member claim as a supervisor. Can approve or reject with feedback. (Restricted to supervisor and admin roles).',
    {
      claimId: z.string().describe('Claim ID to review'),
      action: z.enum(['approve', 'reject']).describe('Action: "approve" or "reject"'),
      reason: z.string().optional().describe('Reason for rejection (required if action is reject)'),
      notes: z.string().optional().describe('Optional comments or supervisor notes')
    },
    async ({ claimId, action, reason, notes }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{ type: 'text', text: '⚠️ Please log in first.' }],
            isError: true
          };
        }

        if (!apiClient.hasRole('supervisor', 'admin')) {
          return {
            content: [{
              type: 'text',
              text: `⛔ Access Denied: Your active role is '${apiClient.currentRole}'. Only supervisors and admins can perform supervisor reviews.`
            }],
            isError: true
          };
        }

        if (action === 'reject' && !reason) {
          return {
            content: [{
              type: 'text',
              text: '⚠️ A reason must be provided when rejecting a claim.'
            }],
            isError: true
          };
        }

        const res = await apiClient.request(`/api/claims/${claimId}/approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, reason, notes })
        });

        return {
          content: [{
            type: 'text',
            text: `✅ Claim ${claimId} successfully ${action}d by supervisor.\nMessage: ${res.message || 'Updated'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Supervisor review failed: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 5. Finance Review Claim (approve / reject)
  server.tool(
    'finance_review_claim',
    'Review a claim as finance manager. Approves for payment or rejects. (Restricted to finance_manager and admin roles).',
    {
      claimId: z.string().describe('Claim ID to approve or reject'),
      action: z.enum(['approve', 'reject']).describe('Action: "approve" or "reject"'),
      reason: z.string().optional().describe('Reason for rejection (required if rejecting)'),
      notes: z.string().optional().describe('Optional notes for audit records')
    },
    async ({ claimId, action, reason, notes }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{ type: 'text', text: '⚠️ Please log in first.' }],
            isError: true
          };
        }

        if (!apiClient.hasRole('finance_manager', 'admin')) {
          return {
            content: [{
              type: 'text',
              text: `⛔ Access Denied: Your role is '${apiClient.currentRole}'. Only finance managers or admins can perform finance approvals.`
            }],
            isError: true
          };
        }

        if (action === 'reject' && !reason) {
          return {
            content: [{
              type: 'text',
              text: '⚠️ A reason must be provided when rejecting a claim.'
            }],
            isError: true
          };
        }

        const res = await apiClient.request(`/api/claims/${claimId}/finance-approve`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action, notes, reason })
        });

        return {
          content: [{
            type: 'text',
            text: `✅ Claim ${claimId} finance review processed: ${action.toUpperCase()}.\nStatus: ${res.claim?.status || res.status || 'Updated'}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Finance review failed: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 6. Settle Claim Payment
  server.tool(
    'settle_claim_payment',
    'Mark a finance-approved claim as settled and paid. (Restricted to finance_manager and admin roles).',
    {
      claimId: z.string().describe('Claim ID to mark as paid'),
      channel: z.enum(['Bank Transfer', 'Cash', 'Check']).default('Bank Transfer').describe('Payout channel')
    },
    async ({ claimId, channel = 'Bank Transfer' }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{ type: 'text', text: '⚠️ Please log in first.' }],
            isError: true
          };
        }

        if (!apiClient.hasRole('finance_manager', 'admin')) {
          return {
            content: [{
              type: 'text',
              text: `⛔ Access Denied: Your role is '${apiClient.currentRole}'. Only finance managers and admins can mark claims as paid.`
            }],
            isError: true
          };
        }

        const res = await apiClient.request(`/api/claims/${claimId}/mark-paid`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ channel })
        });

        return {
          content: [{
            type: 'text',
            text: `💰 Claim ${claimId} successfully settled and marked as PAID!\nChannel: ${channel}\nPaid At: ${new Date().toLocaleString()}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Settlement failed: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 7. List All Claims (Company-wide for Finance & Admin)
  server.tool(
    'list_all_claims',
    'View all claims across the company with filtering options. (Restricted to finance_manager and admin roles).',
    {
      status: z.enum(['submitted', 'approved', 'finance_approved', 'paid', 'rejected']).optional().describe('Filter by status'),
      category: z.string().optional().describe('Filter by category'),
      page: z.number().int().min(1).default(1).describe('Page number'),
      limit: z.number().int().min(1).max(100).default(20).describe('Limit per page')
    },
    async ({ status, category, page = 1, limit = 20 }) => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{ type: 'text', text: '⚠️ Please log in first.' }],
            isError: true
          };
        }

        if (!apiClient.hasRole('finance_manager', 'admin', 'executive')) {
          return {
            content: [{
              type: 'text',
              text: `⛔ Access Denied: Viewing all company claims requires finance_manager or admin role.`
            }],
            isError: true
          };
        }

        const query = new URLSearchParams();
        if (status) query.set('status', status);
        if (category) query.set('category', category);
        query.set('page', String(page));
        query.set('limit', String(limit));

        const res = await apiClient.request(`/api/claims?${query.toString()}`);
        const claims = res.claims || (Array.isArray(res) ? res : []);

        if (claims.length === 0) {
          return {
            content: [{
              type: 'text',
              text: 'No claims found matching the filter.'
            }]
          };
        }

        const formatted = claims.map((c, index) => {
          const id = c.claimId || c._id;
          const employee = c.employeeId?.name || 'Unknown';
          const amt = c.grandTotal || c.amount || 0;
          return `${index + 1}. [${c.status.toUpperCase()}] ID: ${id} | Employee: ${employee} | ₹${amt.toLocaleString()} | Category: ${c.category} | BU: ${c.businessUnit}`;
        }).join('\n');

        return {
          content: [{
            type: 'text',
            text: `📋 Company Claims (${claims.length} retrieved):\n\n${formatted}`
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to retrieve claims: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );

  // 8. Claim Analytics and Summary
  server.tool(
    'get_claim_stats',
    'Get overall claim statistics, breakdown by status, total counts, and aggregate claim amounts. (Restricted to finance_manager and admin).',
    {},
    async () => {
      try {
        if (!apiClient.isAuthenticated) {
          return {
            content: [{ type: 'text', text: '⚠️ Please log in first.' }],
            isError: true
          };
        }

        const res = await apiClient.request('/api/claims/stats');

        const breakdown = (res.statusStats || []).map(s => {
          return `  • ${s._id ? s._id.toUpperCase() : 'UNKNOWN'}: ${s.count} claim(s)`;
        }).join('\n');

        const text = [
          `📊 Claim Settlement Analytics`,
          `---------------------------------`,
          `Total Claims: ${res.totalClaims || 0}`,
          `Total Claimed Amount: ₹${(res.totalAmount || 0).toLocaleString()}`,
          ``,
          `Status Breakdown:`,
          breakdown || '  No data available'
        ].join('\n');

        return {
          content: [{
            type: 'text',
            text
          }]
        };
      } catch (error) {
        return {
          content: [{
            type: 'text',
            text: `Failed to fetch claim stats: ${error.message}`
          }],
          isError: true
        };
      }
    }
  );
}
