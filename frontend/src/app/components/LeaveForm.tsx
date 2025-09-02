'use client';

import { useState } from 'react';
import { useCreateLeaveMutation, useUpdateLeaveMutation } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { store } from '@/lib/store';

interface LeaveFormProps {
  initialData?: any;
  mode?: 'create' | 'edit';
  onSuccess?: () => void;
  onCancel?: () => void;
}

const LEAVE_TYPES = [
  'Business Trip',
  'WFH',
  'Planned Leave',
  'Unplanned Leave',
  'OD',
  'Permission',
  'Flexi'
];

export default function LeaveForm({ 
  initialData, 
  mode = 'create', 
  onSuccess, 
  onCancel 
}: LeaveFormProps) {
  const router = useRouter();
  const [createLeave, { isLoading: isCreating }] = useCreateLeaveMutation();
  const [updateLeave, { isLoading: isUpdating }] = useUpdateLeaveMutation();
  
  const [formData, setFormData] = useState({
    type: initialData?.type || '',
    startDate: initialData?.startDate ? 
      new Date(initialData.startDate).toISOString().split('T')[0] : '',
    endDate: initialData?.endDate ? 
      new Date(initialData.endDate).toISOString().split('T')[0] : '',
    hours: initialData?.hours || '',
    reason: initialData?.reason || '',
    timezone: initialData?.timezone || 'Asia/Kolkata'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSuccess, setIsSuccess] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.type) {
      newErrors.type = 'Leave type is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date cannot be before start date';
      }
    }

    if (formData.type === 'Permission') {
      if (!formData.hours || parseFloat(formData.hours) <= 0 || parseFloat(formData.hours) > 24) {
        newErrors.hours = 'Hours must be between 0.5 and 24 for Permission type';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const submitData = {
        ...formData,
        hours: formData.type === 'Permission' ? parseFloat(formData.hours) : null
      };



      if (mode === 'create') {
        await createLeave(submitData).unwrap();
      } else {
        await updateLeave({ id: initialData._id, ...submitData }).unwrap();
      }

      // Show success message and set success state
      toast.success('Leave request submitted successfully!');
      setIsSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      } else {
        // Redirect to appropriate dashboard after a short delay
        setTimeout(() => {
          // Get user from store to determine routing
          const state = store.getState() as any;
          const currentUser = state.auth.user;
          
          if (currentUser?.email === 'velan@theyellow.network' || currentUser?.email === 'gg@theyellownetwork.com') {
            router.push('/executive');
          } else {
            router.push('/employee');
          }
        }, 1500);
      }
    } catch (error: any) {
      console.error('Form submission error:', error);
      
      // Show error information
      let errorMessage = 'An error occurred while submitting the form';
      if (error.data?.details) {
        errorMessage = error.data.details;
      } else if (error.data?.error) {
        errorMessage = error.data.error;
      } else if (error.status === 400) {
        errorMessage = 'Bad request - please check your form data';
      } else if (error.status === 401) {
        errorMessage = 'Unauthorized - please log in again';
      } else if (error.status === 500) {
        errorMessage = 'Server error - please try again later';
      }
      
      setErrors({ submit: errorMessage });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-set end date to start date for single-day leaves
    if (field === 'startDate' && !formData.endDate) {
      setFormData(prev => ({ ...prev, endDate: value }));
    }

    // Clear hours when type is not Permission
    if (field === 'type' && value !== 'Permission') {
      setFormData(prev => ({ ...prev, hours: '' }));
    }
  };

  const resetForm = () => {
    setFormData({
      type: '',
      startDate: '',
      endDate: '',
      hours: '',
      reason: '',
      timezone: 'Asia/Kolkata'
    });
    setErrors({});
    setIsSuccess(false);
  };

  const isLoading = isCreating || isUpdating;
  const isFormDisabled = isLoading || isSuccess;

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {mode === 'create' ? 'Submit Leave Request' : 'Edit Leave Request'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Leave Type */}
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type *
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) => handleInputChange('type', e.target.value)}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              errors.type ? 'border-red-500' : 'border-gray-300'
            }`}
            disabled={isFormDisabled}
          >
            <option value="">Select leave type</option>
            {LEAVE_TYPES.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          {errors.type && <p className="mt-1 text-sm text-red-600">{errors.type}</p>}
        </div>

        {/* Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              id="startDate"
              value={formData.startDate}
              onChange={(e) => handleInputChange('startDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.startDate ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isFormDisabled}
            />
            {errors.startDate && <p className="mt-1 text-sm text-red-600">{errors.startDate}</p>}
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
              End Date *
            </label>
            <input
              type="date"
              id="endDate"
              value={formData.endDate}
              onChange={(e) => handleInputChange('endDate', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.endDate ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isFormDisabled}
            />
            {errors.endDate && <p className="mt-1 text-sm text-red-600">{errors.endDate}</p>}
          </div>
        </div>

        {/* Hours (only for Permission type) */}
        {formData.type === 'Permission' && (
          <div>
            <label htmlFor="hours" className="block text-sm font-medium text-gray-700 mb-2">
              Hours *
            </label>
            <input
              type="number"
              id="hours"
              step="0.5"
              min="0.5"
              max="24"
              value={formData.hours}
              onChange={(e) => handleInputChange('hours', e.target.value)}
              placeholder="Enter hours (0.5 - 24)"
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.hours ? 'border-red-500' : 'border-gray-300'
              }`}
              disabled={isFormDisabled}
            />
            {errors.hours && <p className="mt-1 text-sm text-red-600">{errors.hours}</p>}
            <p className="mt-1 text-sm text-gray-500">
              For partial day leave, specify the number of hours needed.
            </p>
          </div>
        )}

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
            Reason (Optional)
          </label>
          <textarea
            id="reason"
            rows={3}
            value={formData.reason}
            onChange={(e) => handleInputChange('reason', e.target.value)}
            placeholder="Enter reason for leave (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isFormDisabled}
          />
        </div>

        {/* Submit Error */}
        {errors.submit && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}

        {/* Success Message */}
        {isSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-600">
              ✅ Leave request submitted successfully! Redirecting to dashboard...
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="submit"
            disabled={isFormDisabled}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {mode === 'create' ? 'Submitting...' : 'Updating...'}
              </span>
            ) : (
              mode === 'create' ? 'Submit Leave Request' : 'Update Leave Request'
            )}
          </button>
          
          {onCancel && !isSuccess && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isFormDisabled}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
          )}
          
          {isSuccess && (
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 transition-colors"
            >
              Submit Another Leave Request
            </button>
          )}
        </div>
      </form>

      {/* Info Box */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Leave Request Guidelines:</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• All leave requests require approval from CTO or CEO</li>
          <li>• You can edit or delete requests only while they are in "submitted" status</li>
          <li>• Permission type requires hours (0.5 - 24) for partial day leave</li>
          <li>• For single day leaves, start and end dates should be the same</li>
        </ul>
      </div>
    </div>
  );
}
