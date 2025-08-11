'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateClaimMutation, useGetPolicyQuery, useUploadClaimFileMutation } from '../../lib/api';
import toast from 'react-hot-toast';
import { X, Upload, FileText } from 'lucide-react';

const claimSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  subCategory: z.string().min(1, 'Sub-category is required'),
  date: z.string().min(1, 'Date is required'),
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  gstTotal: z.number().min(0, 'GST must be 0 or greater'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
});

type ClaimFormData = z.infer<typeof claimSchema>;

interface ClaimFormProps {
  onClose: () => void;
  employeeId: string;
}

export default function ClaimForm({ onClose, employeeId }: ClaimFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [createClaim, { isLoading }] = useCreateClaimMutation();
  const [uploadClaimFile] = useUploadClaimFileMutation();
  const { data: policy, isLoading: policyLoading, error: policyError } = useGetPolicyQuery({});

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    reset,
  } = useForm<ClaimFormData>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      gstTotal: 0
    }
  });

  // Debug logging
  console.log('Policy data:', policy);
  console.log('Policy loading:', policyLoading);
  console.log('Policy error:', policyError);
  console.log('Categories:', policy?.claimCategories);
  console.log('Allowed file types:', policy?.allowedFileTypes);
  console.log('Accept attribute:', policy?.allowedFileTypes?.map((type: string) => `.${type}`).join(','));
  console.log('Selected category:', watch('category'));

  const watchedSubCategory = watch('subCategory');
  const isFlightTravel = watchedSubCategory?.toLowerCase().includes('flight');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const onSubmit = async (data: ClaimFormData) => {
    try {
      console.log('Form data received:', data);
      console.log('Description length:', data.description?.length);
      console.log('Category selected:', data.category);
      console.log('Files to upload:', files);
      
      // Validate GST for flight travel
      if (isFlightTravel && (!data.gstTotal || data.gstTotal <= 0)) {
        toast.error('GST is mandatory for flight travel expenses');
        return;
      }

      // Validate that at least one file is uploaded
      if (files.length === 0) {
        toast.error('At least one file attachment is required');
        return;
      }

      // Validate that at least one PDF is included
      const hasPdf = files.some(file => file.name.toLowerCase().endsWith('.pdf'));
      if (!hasPdf) {
        toast.error('At least one PDF attachment is required');
        return;
      }

      const claimData = {
        ...data,
        employeeId,
        amount: Number(data.amount) || 0,
        gstTotal: Number(data.gstTotal) || 0,
        date: new Date(data.date).toISOString(),
        lineItems: [{
          date: new Date(data.date),
          subCategory: data.subCategory,
          description: data.description,
          amount: Number(data.amount) || 0,
          gstTotal: Number(data.gstTotal) || 0,
          amountInINR: (Number(data.amount) || 0) + (Number(data.gstTotal) || 0),
          currency: 'INR',
          attachments: [] // Will be populated after file uploads
        }]
      };

      console.log('Submitting claim data:', claimData);
      
      // Step 1: Create the claim
      const createdClaim = await createClaim(claimData).unwrap();
      console.log('Claim created:', createdClaim);

      // Step 2: Upload files to the created claim
      const uploadPromises = files.map(async (file) => {
        return uploadClaimFile({
          claimId: createdClaim._id,
          file: file
        }).unwrap();
      });

      await Promise.all(uploadPromises);
      console.log('All files uploaded successfully');

      toast.success('Claim submitted successfully with attachments!');
      reset();
      setFiles([]);
      onClose();
    } catch (error: any) {
      console.error('Claim submission error:', error);
      
      // Handle validation errors from backend
      if (error?.data?.violations && Array.isArray(error.data.violations)) {
        error.data.violations.forEach((violation: any) => {
          toast.error(`${violation.field}: ${violation.message}`);
        });
      } else if (error?.data?.message) {
        toast.error(error.data.message);
      } else if (error?.message) {
        toast.error(error.message);
      } else {
        toast.error('Failed to submit claim');
      }
    }
  };

  if (policyLoading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading policy...</p>
          </div>
        </div>
      </div>
    );
  }

  if (policyError) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="text-center">
            <p className="text-red-600">Failed to load policy. Please try again.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Submit New Claim</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category *
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select Category</option>
                             {(policy?.claimCategories || [
                 'Travel & Lodging',
                 'Client Entertainment & Business Meals',
                 'Employee Welfare & HR',
                 'Training & Development',
                 'Marketing & Business Development',
                 'Subscriptions & Memberships',
                 'Office & Admin',
                 'IT & Software',
                 'Project / Client-Billable Expenses',
                 'Finance, Legal & Compliance',
                 'Advances & Reconciliations'
               ]).map((category: string) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sub-Category *
            </label>
            <input
              {...register('subCategory')}
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Flight, Train, Hotel, etc."
            />
            {errors.subCategory && (
              <p className="mt-1 text-sm text-red-600">{errors.subCategory.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date *
            </label>
            <input
              {...register('date')}
              type="date"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              {...register('amount', { valueAsNumber: true })}
              type="number"
              step="any"
              min="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              GST Amount {isFlightTravel && '*'}
            </label>
            <input
              {...register('gstTotal', { valueAsNumber: true })}
              type="number"
              step="any"
              min="0"
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                isFlightTravel ? 'border-gray-300' : 'border-gray-300'
              }`}
              placeholder="0.00"
            />
            {errors.gstTotal && (
              <p className="mt-1 text-sm text-red-600">{errors.gstTotal.message}</p>
            )}
            {isFlightTravel && (
              <p className="mt-1 text-xs text-red-600">
                * GST is mandatory for flight travel expenses
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description *
            </label>
            <textarea
              {...register('description')}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the expense..."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Attachments *
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept={policy?.allowedFileTypes?.map((type: string) => `.${type}`).join(',') || '.pdf,.jpg,.jpeg,.png'}
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="h-8 w-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  Click to upload files
                </span>
                <span className="text-xs text-gray-500 mt-1">
                  Max size: {policy?.maxFileSizeMB}MB
                </span>
                <span className="text-xs text-red-500 mt-1">
                  * At least one PDF file is required
                </span>
              </label>
            </div>
            {files.length > 0 && (
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected files:</p>
                <ul className="space-y-1">
                  {files.map((file, index) => (
                    <li key={index} className="flex items-center text-sm text-gray-600">
                      <FileText className="h-4 w-4 mr-2" />
                      {file.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
