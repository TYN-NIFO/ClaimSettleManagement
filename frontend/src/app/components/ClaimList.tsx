"use client";

import { format } from "date-fns";
import {
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit,
  ThumbsUp,
  DollarSign,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import PaymentModal from "./PaymentModal";
import FinanceApprovalModal from "./FinanceApprovalModal";
import ExecutiveApprovalModal from "./ExecutiveApprovalModal";
import {
  useMarkPaidMutation,
  useFinanceApproveMutation,
  useExecutiveApproveMutation,
  useDeleteClaimMutation,
} from "@/lib/api";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/store";

interface LineItem {
  _id: string;
  name: string;
  date: string;
  subCategory: string;
  description: string;
  currency: string;
  amount: number;
  gstTotal: number;
  amountInINR: number;
  attachments: any[];
}

export interface Claim {
  _id: string;
  category: string;
  businessUnit: string;
  purpose?: string;
  advances: any[];
  lineItems: LineItem[];
  grandTotal: number;
  netPayable: number;
  status: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
  };

  financeApproval?: {
    status: string;
    approvedBy?: {
      name: string;
    };
    approvedAt?: string;
    reason?: string;
    notes?: string;
  };
  payment?: {
    paidBy?: {
      name: string;
    };
    paidAt?: string;
    channel?: string;
    reference?: string;
  };
  createdAt: string;
  updatedAt: string;
  violations: any[];
}

interface ClaimListProps {
  claims: Claim[];
  onApprovalClick?: (claim: Claim) => void;
  onPaymentClick?: (claim: Claim) => void;
  showApprovalButtons?: boolean;
  showPaymentButtons?: boolean;
  showEmployeeName?: boolean;
}

export default function ClaimList({
  claims,
  onApprovalClick,
  onPaymentClick,
  showApprovalButtons = false,
  showPaymentButtons = false,
  showEmployeeName = true,
}: ClaimListProps) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [payingClaim, setPayingClaim] = useState<Claim | null>(null);
  const [financeApproveClaim, setFinanceApproveClaim] = useState<Claim | null>(
    null
  );
  const [executiveApproveClaim, setExecutiveApproveClaim] = useState<Claim | null>(
    null
  );
  const [deletingClaim, setDeletingClaim] = useState<string | null>(null);
  const [markPaid] = useMarkPaidMutation();
  const [financeApprove] = useFinanceApproveMutation();
  const [executiveApprove] = useExecutiveApproveMutation();
  const [deleteClaim] = useDeleteClaimMutation();

  const handleViewClaim = (claimId: string) => {
    router.push(`/claims/${claimId}`);
  };

  const handleEditClaim = (claimId: string) => {
    router.push(`/claims/${claimId}/edit`);
  };

  const canEditClaim = (claim: Claim): boolean => {
    if (!user) return false;

    // Admin can edit all claims
    if (user.role === "admin") return true;

    // Finance managers can edit any claim at any time
    if (user.role === "finance_manager") return true;

    // Executives can edit any claim at any time (identified by email currently)
    const isExecutive = user.email === 'velan@theyellow.network' || user.email === 'gg@theyellownetwork.com';
    if (isExecutive) return true;

    // Employees can edit their own claims only before finance approval
    if (user.role === "employee") {
      const isBeforeFinanceApproval = !["finance_approved", "executive_approved", "paid"].includes(claim.status);
      return claim.employeeId._id === user._id && isBeforeFinanceApproval;
    }

    return false;
  };

  const canApproveClaim = (claim: Claim): boolean => {
    if (!user) return false;

    // Finance managers can approve claims that are submitted (FIRST APPROVAL)
    if (user.role === "finance_manager") {
      return claim.status === "submitted" && claim.employeeId._id !== user._id;
    }

    // Executives can approve claims that are finance approved (FINAL APPROVAL)
    const isExecutive = user.email === 'velan@theyellow.network' || user.email === 'gg@theyellownetwork.com';
    if (isExecutive) {
      return claim.status === "finance_approved";
    }

    return false;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "rejected":
        return <XCircle className="h-5 w-5 text-red-500" />;
      case "submitted":
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case "approved":
      case "s1_approved":
      case "s2_approved":
      case "both_approved":
      case "finance_approved":
        return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case "executive_approved":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "submitted":
        return "Submitted";
      case "approved":
        return "Approved";
      case "finance_approved":
        return "Finance Approved";
      case "executive_approved":
        return "Executive Approved";
      case "paid":
        return "Paid";
      case "rejected":
        return "Rejected";

      default:
        return status.replace("_", " ").toUpperCase();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "submitted":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
      case "s1_approved":
      case "s2_approved":
      case "both_approved":
      case "finance_approved":
        return "bg-blue-100 text-blue-800";
      case "executive_approved":
        return "bg-green-100 text-green-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPaymentStatus = (claim: Claim) => {
    if (claim.status === "paid" || claim.payment?.paidAt) {
      return {
        text: "Paid",
        color: "bg-green-100 text-green-800",
        icon: <CheckCircle className="h-4 w-4 text-green-500" />,
      };
    }
    return undefined;
  };

  const getFirstLineItem = (claim: Claim) => {
    return claim.lineItems[0] || null;
  };

  const canMarkAsPaid = (claim: Claim): boolean => {
    if (!user) return false;
    const canMark = user.role === "finance_manager" && claim.status === "executive_approved";
    console.log('🔍 canMarkAsPaid check:', {
      userId: user._id,
      userRole: user.role,
      claimId: claim._id,
      claimStatus: claim.status,
      canMark: canMark
    });
    return canMark;
  };

  const canDeleteClaim = (claim: Claim): boolean => {
    if (!user) return false;

    // Admin can delete any claim
    if (user.role === "admin") return true;

    // Finance managers can delete any claim at any time
    if (user.role === "finance_manager") return true;

    // Executives can delete any claim at any time (identified by email currently)
    const isExecutive = user.email === 'velan@theyellow.network' || user.email === 'gg@theyellownetwork.com';
    if (isExecutive) return true;

    // Employees can delete their own claims only before finance approval
    if (user.role === "employee") {
      const isBeforeFinanceApproval = !["finance_approved", "executive_approved", "paid"].includes(claim.status);
      return claim.employeeId._id === user._id && isBeforeFinanceApproval;
    }

    return false;
  };

  const handleMarkAsPaid = async (claimId: string, channel?: string) => {
    try {
      await markPaid({ id: claimId, channel: channel || "manual" }).unwrap();
      setPayingClaim(null);
    } catch (e) {
      // swallow; UI can show global toasts if available
    }
  };

  const handleFinanceApprove = async (
    claimId: string,
    approved: boolean,
    notes?: string,
    rejectionReason?: string
  ) => {
    try {
      await financeApprove({
        id: claimId,
        action: approved ? "approve" : "reject",
        notes,
        reason: rejectionReason || notes,
      }).unwrap();
      setFinanceApproveClaim(null);
    } catch (e) {
      // swallow
    }
  };

  const handleExecutiveApprove = async (
    claimId: string,
    approved: boolean,
    notes?: string,
    rejectionReason?: string
  ) => {
    try {
      await executiveApprove({
        id: claimId,
        action: approved ? "approve" : "reject",
        notes,
        reason: rejectionReason || notes,
      }).unwrap();
      setExecutiveApproveClaim(null);
    } catch (e) {
      // swallow
    }
  };

  const handleDeleteClaim = async (claimId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this claim? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingClaim(claimId);
      const result = await deleteClaim(claimId).unwrap();
      toast.success(result.message || "Claim deleted successfully");
    } catch (error: any) {
      const errorMessage =
        error?.data?.error || error?.message || "Failed to delete claim";
      toast.error(errorMessage);
    } finally {
      setDeletingClaim(null);
    }
  };

  if (claims.length === 0) {
    return (
      <div className="text-center py-3">
        <p className="text-gray-500">No claims found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Claim ID
            </th>
            {showEmployeeName && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Employee
              </th>
            )}

            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Expense Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th> */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment Status
            </th> */}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Claim Date
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {claims.map((claim: any) => {
            const firstLineItem = getFirstLineItem(claim);
            return (
              <tr key={claim._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {claim._id.slice(-8)}
                </td>
                {showEmployeeName && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div className="font-medium text-gray-900">
                        {claim.employeeId?.name || "Unknown Employee"}
                      </div>
                      {/* <div className="text-gray-500">
                        {claim.employeeId?.email || 'No email'}
                      </div> */}
                    </div>
                  </td>
                )}

                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {claim.category}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {firstLineItem
                    ? format(new Date(firstLineItem.date), "MMM dd, yyyy")
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  ₹{claim.grandTotal?.toLocaleString() || "0"}
                </td>
                {/* <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                  {firstLineItem?.description || 'N/A'}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {getStatusIcon(claim.status)}
                    <span
                      className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        claim.status
                      )}`}
                    >
                      {getStatusText(claim.status)}
                    </span>
                  </div>
                </td>
                {/* <td className="px-6 py-4 whitespace-nowrap">
                  {(() => {
                    const ps = getPaymentStatus(claim);
                    if (!ps) return <span className="text-sm text-gray-400">-</span>;
                    return (
                      <div className="flex items-center">
                        {ps.icon}
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${ps.color}`}>
                          {ps.text}
                        </span>
                      </div>
                    );
                  })()}
                </td> */}
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {claim.createdAt
                    ? format(new Date(claim.createdAt), "MMM dd, yyyy")
                    : "N/A"}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleViewClaim(claim._id)}
                      className="text-indigo-600 hover:text-indigo-900"
                      title="View Claim"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    {canEditClaim(claim) && (
                      <button
                        onClick={() => handleEditClaim(claim._id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Edit Claim"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                    )}
                    {user?.role === "finance_manager" &&
                      canApproveClaim(claim) &&
                      onApprovalClick && (
                        <button
                          onClick={() => onApprovalClick(claim)}
                          className="text-green-600 hover:text-green-900"
                          title="Finance Approve/Reject"
                        >
                          <ThumbsUp className="h-5 w-5" />
                        </button>
                      )}
                    {(user?.email === 'velan@theyellow.network' || user?.email === 'gg@theyellownetwork.com') &&
                      canApproveClaim(claim) && (
                        <button
                          onClick={() => setExecutiveApproveClaim(claim)}
                          className="text-green-600 hover:text-green-900"
                          title="Executive Approve/Reject"
                        >
                          <ThumbsUp className="h-5 w-5" />
                        </button>
                      )}
                    {canMarkAsPaid(claim) && (
                      <button
                        onClick={() => {
                          console.log('💰 Payment button clicked for claim:', claim._id);
                          onPaymentClick ? onPaymentClick(claim) : setPayingClaim(claim);
                        }}
                        className="text-green-600 hover:text-green-900"
                        title="Mark as Paid"
                      >
                        <DollarSign className="h-5 w-5" />
                      </button>
                    )}
                    {canDeleteClaim(claim) && (
                      <button
                        onClick={() => handleDeleteClaim(claim._id)}
                        disabled={deletingClaim === claim._id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                        title="Delete Claim"
                      >
                        {deletingClaim === claim._id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                        ) : (
                          <Trash2 className="h-5 w-5" />
                        )}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {payingClaim && (
        <PaymentModal
          claim={payingClaim}
          onClose={() => setPayingClaim(null)}
          onPay={handleMarkAsPaid}
        />
      )}
      {financeApproveClaim && (
        <FinanceApprovalModal
          claim={financeApproveClaim}
          onClose={() => setFinanceApproveClaim(null)}
          onApprove={handleFinanceApprove}
        />
      )}
      {executiveApproveClaim && (
        <ExecutiveApprovalModal
          claim={executiveApproveClaim}
          onClose={() => setExecutiveApproveClaim(null)}
          onApprove={handleExecutiveApprove}
        />
      )}
    </div>
  );
}
