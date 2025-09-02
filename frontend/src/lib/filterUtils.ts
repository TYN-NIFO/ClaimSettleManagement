import { FilterState } from '../app/components/FilterBar';

export interface Claim {
  _id: string;
  employeeId: {
    _id: string;
    name: string;
    email: string;
  };
  category: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  grandTotal: number;
  lineItems: Array<{
    description: string;
    amount: number;
    date: string;
    subCategory?: string;
    currency?: string;
    gstTotal?: number;
    amountInINR?: number;
    attachments?: Array<{
      fileId: string;
      name: string;
      size: number;
      mime: string;
      storageKey: string;
      label: string;
    }>;
  }>;
  supervisorApproval?: {
    status: string;
    approvedBy?: {
      _id: string;
      name: string;
      email: string;
    };
    approvedAt?: string;
    notes?: string;
  };
  financeApproval?: {
    status: string;
    approvedBy?: {
      _id: string;
      name: string;
      email: string;
    };
    approvedAt?: string;
    notes?: string;
  };
  payment?: {
    paidBy?: {
      _id: string;
      name: string;
      email: string;
    };
    paidAt?: string;
    channel?: string;
  };
  violations?: any[];
  attachments?: any[];
}

export function filterClaims(claims: Claim[], filters: FilterState): Claim[] {
 console.log("claims------->", claims)
 console.log("claims------->", filters)
  return claims.filter(claim => {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = [
        claim.employeeId?.name || '',
        claim.employeeId?.email || '',
        claim.category,
        claim.status,
        ...claim.lineItems.map(item => item.description)
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(searchTerm)) {
        return false;
      }
    }

    // Employee filter
    if (filters.employeeId && claim.employeeId?._id !== filters.employeeId) {
      return false;
    }

    // Category filter
    if (filters.category && claim.category !== filters.category) {
      return false;
    }

    // Status filter
    if (filters.status && claim.status !== filters.status) {
      return false;
    }

    // Date range filter
    if (filters.startDate || filters.endDate) {
      const claimDate = new Date(claim.createdAt);
      
      if (filters.startDate) {
        const startDate = new Date(filters.startDate);
        if (claimDate < startDate) {
          return false;
        }
      }
      
      if (filters.endDate) {
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (claimDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });
}

export function sortClaims(claims: Claim[], sortBy: string = 'createdAt', sortOrder: 'asc' | 'desc' = 'desc'): Claim[] {
  return [...claims].sort((a, b) => {
    let aValue: any;
    let bValue: any;

    switch (sortBy) {
      case 'employee':
        aValue = a.employeeId?.name || '';
        bValue = b.employeeId?.name || '';
        break;
      case 'category':
        aValue = a.category;
        bValue = b.category;
        break;
      case 'status':
        aValue = a.status;
        bValue = b.status;
        break;
      case 'amount':
        aValue = a.grandTotal;
        bValue = b.grandTotal;
        break;
      case 'createdAt':
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
        break;
      case 'updatedAt':
        aValue = new Date(a.updatedAt);
        bValue = new Date(b.updatedAt);
        break;
      default:
        aValue = new Date(a.createdAt);
        bValue = new Date(b.createdAt);
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
}

export function getFilterStats(claims: Claim[], filters: FilterState) {
  const filteredClaims = filterClaims(claims, filters);
  
  const stats = {
    total: claims.length,
    filtered: filteredClaims.length,
    byStatus: {} as Record<string, number>,
    byCategory: {} as Record<string, number>,
    byEmployee: {} as Record<string, number>,
    totalAmount: 0,
    averageAmount: 0
  };

  // Calculate stats for all claims
  claims.forEach(claim => {
    stats.byStatus[claim.status] = (stats.byStatus[claim.status] || 0) + 1;
    stats.byCategory[claim.category] = (stats.byCategory[claim.category] || 0) + 1;
    const employeeName = claim.employeeId?.name || 'Unknown';
    stats.byEmployee[employeeName] = (stats.byEmployee[employeeName] || 0) + 1;
    stats.totalAmount += claim.grandTotal || 0;
  });

  // Calculate filtered stats
  const filteredAmount = filteredClaims.reduce((sum, claim) => sum + (claim.grandTotal || 0), 0);
  
  stats.averageAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;

  return {
    ...stats,
    filteredAmount,
    filteredAverageAmount: filteredClaims.length > 0 ? filteredAmount / filteredClaims.length : 0
  };
}

export function getUniqueCategories(claims: Claim[]): string[] {
  const categories = new Set(claims.map(claim => claim.category));
  return Array.from(categories).sort();
}

export function getUniqueEmployees(claims: Claim[]): Array<{id: string, name: string, department?: string}> {
  const employeeMap = new Map();
  
  claims.forEach(claim => {
    if (claim.employeeId && claim.employeeId.name) {
      employeeMap.set(claim.employeeId._id, {
        id: claim.employeeId._id,
        name: claim.employeeId.name,
        department: undefined // Removed department access as it does not exist
      });
    }
  });
  
  return Array.from(employeeMap.values()).sort((a, b) => a.name.localeCompare(b.name));
}
