'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateClaimMutation, useGetPolicyQuery } from '../../lib/api';
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
  const { data: policy, isLoading: policyLoading, error: policyError } = useGetPolicyQuery({});

  // Debug logging
  console.log('Policy data:', policy);
  console.log('Policy loading:', policyLoading);
  console.log('Policy error:', policyError);
  console.log('Categories:', policy?.claimCategories);

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

  const watchedSubCategory = watch('subCategory');
  const isFlightTravel = watchedSubCategory?.toLowerCase().includes('flight');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    setFiles(selectedFiles);
  };

  const onSubmit = async (data: ClaimFormData) => {
    try {
      // Validate GST for flight travel
      if (isFlightTravel && (!data.gstTotal || data.gstTotal <= 0)) {
        toast.error('GST is mandatory for flight travel expenses');
        return;
      }

      const claimData = {
        ...data,
        employeeId,
        amount: parseFloat(data.amount.toString()),
        gstTotal: parseFloat(data.gstTotal.toString()),
        date: new Date(data.date).toISOString(),
        lineItems: [{
          date: new Date(data.date),
          subCategory: data.subCategory,
          description: data.description,
          amount: parseFloat(data.amount.toString()),
          gstTotal: parseFloat(data.gstTotal.toString()),
          amountInINR: parseFloat(data.amount.toString()) + parseFloat(data.gstTotal.toString()),
          currency: 'INR'
        }]
      };

      await createClaim(claimData).unwrap();
      toast.success('Claim submitted successfully!');
      reset();
      setFiles([]);
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit claim';
      toast.error(errorMessage);
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
              {policy?.claimCategories?.map((category: string) => (
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
              step="0.01"
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
              step="0.01"
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
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept={policy?.allowedFileTypes?.map((type: string) => `.${type}`).join(',')}
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
