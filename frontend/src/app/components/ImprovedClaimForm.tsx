'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useCreateClaimMutation, useUpdateClaimMutation, useGetPolicyQuery, useUploadClaimFilesMutation } from '../../lib/api';
import { 
  categoryMaster, 
  businessUnits, 
  getSubCategoriesForCategory
} from '../../lib/categoryMaster';
import { convertToINR, formatCurrency } from '../../lib/currencyConverter';
import toast from 'react-hot-toast';
import { 
  X, 
  Upload, 
  FileText, 
  Plus,
  ArrowLeft
} from 'lucide-react';

// Currency options
const currencies = ['INR', 'USD', 'EUR'] as const;

// Simplified schema
const createClaimSchema = () => {
  const baseSchema = z.object({
    businessUnit: z.enum(businessUnits as [string, ...string[]]),
    category: z.string().min(1, 'Category is required'),
    advances: z.array(z.object({
      date: z.string().min(1, 'Date is required'),
      refNo: z.string().optional(),
      amount: z.number().positive('Amount must be positive')
    })).default([]),
    lineItems: z.array(z.object({
      date: z.string().min(1, 'Date is required'),
      subCategory: z.string().min(1, 'Sub-category is required'),
      description: z.string().min(1, 'Description is required'),
      currency: z.enum(currencies),
      amount: z.number().positive('Amount must be positive'),
      gstTotal: z.number().min(0, 'GST total must be non-negative'),
      amountInINR: z.number().positive('Amount in INR is required'),
      attachments: z.array(z.object({
        fileId: z.string(),
        name: z.string(),
        size: z.number(),
        mime: z.string(),
        storageKey: z.string(),
        label: z.string()
      })).default([])
    })).min(1, 'At least one line item is required').max(15, 'Maximum 15 line items allowed')
  });

  return baseSchema;
};

type ClaimFormData = z.infer<ReturnType<typeof createClaimSchema>>;

interface ImprovedClaimFormProps {
  onClose: () => void;
  employeeId?: string;
  existingClaim?: any;
  isEditing?: boolean;
}

export default function ImprovedClaimForm({ onClose, employeeId, existingClaim, isEditing = false }: ImprovedClaimFormProps) {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<{ [key: number]: File[] }>({});
  const [fileLabels, setFileLabels] = useState<{ [key: number]: string[] }>({});
  
  const [createClaim, { isLoading: isCreatingClaim }] = useCreateClaimMutation();
  const [updateClaim, { isLoading: isUpdatingClaim }] = useUpdateClaimMutation();
  const [uploadClaimFiles, { isLoading: isUploadingFiles }] = useUploadClaimFilesMutation();
  const { data: policy, isLoading: policyLoading } = useGetPolicyQuery({});

  const schema = createClaimSchema();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset
  } = useForm<ClaimFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      businessUnit: 'Alliance',
      category: '',
      advances: [],
      lineItems: []
    }
  });

  const { fields: advanceFields, append: appendAdvance, remove: removeAdvance } = useFieldArray({
    control,
    name: 'advances'
  });

  const { fields: lineItemFields, append: appendLineItem, remove: removeLineItem } = useFieldArray({
    control,
    name: 'lineItems'
  });

  // Initialize form with existing claim data when editing
  useEffect(() => {
    if (isEditing && existingClaim) {
      const claimData = {
        businessUnit: existingClaim.businessUnit || 'Alliance',
        category: existingClaim.category || '',
        advances: existingClaim.advances || [],
        lineItems: existingClaim.lineItems?.map((item: any) => ({
          date: item.date ? new Date(item.date).toISOString().split('T')[0] : '',
          subCategory: item.subCategory || '',
          description: item.description || '',
          currency: item.currency || 'INR',
          amount: item.amount || 0,
          gstTotal: item.gstTotal || 0,
          amountInINR: item.amountInINR || 0,
          attachments: item.attachments || []
        })) || []
      };
      
      reset(claimData);
      setSelectedCategory(existingClaim.category || '');
    }
  }, [isEditing, existingClaim, reset]);

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setValue('category', category);
  };

  // Add line item
  const addLineItem = () => {
    if (lineItemFields.length >= 15) {
      toast.error('Maximum 15 line items allowed');
      return;
    }

    const newLineItem = {
      date: new Date().toISOString().slice(0, 10), // Default to current date
      subCategory: '',
      description: '',
      currency: 'INR' as const,
      amount: 0,
      gstTotal: 0,
      amountInINR: 0,
      attachments: []
    };

    appendLineItem(newLineItem);
  };

  // Handle file upload - restrict to single PDF
  const handleFileUpload = (files: FileList | null, lineItemIndex: number, event?: React.ChangeEvent<HTMLInputElement>) => {
    if (!files) {
      return;
    }
    
    const file = files[0]; // Only take the first file
    
    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are allowed');
      return;
    }
    
    // Validate file size (4MB limit for Vercel free tier compatibility)
    const maxSize = 4 * 1024 * 1024; // 4MB
    if (file.size > maxSize) {
      toast.error(`File size must be less than 4MB. Current file size: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }
    
    // Additional validation for very small files (likely corrupted)
    if (file.size < 1024) { // Less than 1KB
      toast.error('File appears to be too small or corrupted. Please select a valid PDF file.');
      return;
    }
    
    // Replace existing files with new file (single file only)
    setUploadedFiles(prev => ({
      ...prev,
      [lineItemIndex]: [file]
    }));
    setFileLabels(prev => ({
      ...prev,
      [lineItemIndex]: ['supporting_doc']
    }));
    
    toast.success(`File "${file.name}" selected for line item ${lineItemIndex + 1} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
  };

  // Remove file from line item
  const removeFile = (lineItemIndex: number, fileIndex: number) => {
    setUploadedFiles(prev => {
      const newFiles = { ...prev };
      if (newFiles[lineItemIndex]) {
        newFiles[lineItemIndex] = newFiles[lineItemIndex].filter((_, index) => index !== fileIndex);
        if (newFiles[lineItemIndex].length === 0) {
          delete newFiles[lineItemIndex];
        }
      }
      return newFiles;
    });
    
    setFileLabels(prev => {
      const newLabels = { ...prev };
      if (newLabels[lineItemIndex]) {
        newLabels[lineItemIndex] = newLabels[lineItemIndex].filter((_, index) => index !== fileIndex);
        if (newLabels[lineItemIndex].length === 0) {
          delete newLabels[lineItemIndex];
        }
      }
      return newLabels;
    });
    
    // Reset the file input to allow re-uploading the same file
    const fileInput = document.getElementById(`file-upload-${lineItemIndex}`) as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Calculate totals
  const calculateTotals = () => {
    const lineItems = watch('lineItems');
    const advances = watch('advances');
    
    const grandTotal = lineItems.reduce((sum: number, item: any) => sum + (item.amountInINR || 0), 0);
    const advancesTotal = advances.reduce((sum: number, advance: any) => sum + (advance.amount || 0), 0);
    const netPayable = grandTotal - advancesTotal;
    
    return { grandTotal, advancesTotal, netPayable };
  };

  const totals = calculateTotals();

  const onSubmit = async (data: ClaimFormData) => {
    try {
      if (!employeeId) {
        toast.error('Employee ID is required');
        console.error('Employee ID missing:', { employeeId });
        return;
      }

      console.log('Form data validation passed:', data);
      console.log('Employee ID:', employeeId);
      console.log('Uploaded files:', uploadedFiles);

      // Validate total file size for Vercel compatibility
      const totalFileSize = Object.values(uploadedFiles).reduce((total, files) => {
        return total + files.reduce((sum, file) => sum + file.size, 0);
      }, 0);
      
      const maxTotalSize = 4 * 1024 * 1024; // 4MB total limit
      if (totalFileSize > maxTotalSize) {
        toast.error(`Total file size (${(totalFileSize / 1024 / 1024).toFixed(2)}MB) exceeds the 4MB limit for Vercel free tier. Please reduce file sizes.`);
        return;
      }

      // Convert string dates to Date objects for backend
      const processedData = {
        ...data,
        lineItems: data.lineItems.map(item => ({
          ...item,
          date: new Date(item.date)
        })),
        advances: data.advances.map(advance => ({
          ...advance,
          date: new Date(advance.date)
        }))
      };

      const claimData = {
        ...processedData,
        employeeId,
        grandTotal: totals.grandTotal,
        netPayable: totals.netPayable,
        totalsByHead: {} // Calculate based on line item types
      };



      let result;
      if (isEditing && existingClaim) {
        result = await updateClaim({
          id: existingClaim._id,
          ...claimData
        }).unwrap();
      } else {
        result = await createClaim(claimData).unwrap();
      }
      
      // Extract the claim object from the result
      const claim = result.claim || result;
      
      // Upload files for each line item if they exist
      const uploadPromises = Object.entries(uploadedFiles).map(async ([lineItemIndex, files]) => {
        if (files.length > 0) {
          const labels = fileLabels[parseInt(lineItemIndex)] || [];
          try {
            // Validate that claim.lineItems exists and has the expected index
            if (!claim.lineItems || !Array.isArray(claim.lineItems)) {
              throw new Error('Claim result does not contain lineItems array');
            }
            
            const lineItemIndexNum = parseInt(lineItemIndex);
            if (lineItemIndexNum < 0 || lineItemIndexNum >= claim.lineItems.length) {
              throw new Error(`Line item index ${lineItemIndexNum} is out of bounds. Available line items: ${claim.lineItems.length}`);
            }
            
            const lineItem = claim.lineItems[lineItemIndexNum];
            if (!lineItem || !lineItem._id) {
              throw new Error(`Line item at index ${lineItemIndexNum} is missing or has no ID`);
            }
            
            const uploadResult = await uploadClaimFiles({
              claimId: claim._id,
              lineItemId: lineItem._id,
              files,
              labels
            }).unwrap();
            
            // Show detailed upload results
            if (uploadResult.failedFiles && uploadResult.failedFiles.length > 0) {
              uploadResult.failedFiles.forEach((failedFile: any) => {
                toast.error(`Failed to upload ${failedFile.filename}: ${failedFile.error}`);
              });
            }
            
            if (uploadResult.uploadedFiles && uploadResult.uploadedFiles.length > 0) {
              toast.success(`Successfully uploaded ${uploadResult.uploadedFiles.length} file(s) for line item ${parseInt(lineItemIndex) + 1}`);
            }
          } catch (error: any) {
            const errorMessage = error?.data?.error || error?.message || 'Unknown upload error';
            toast.error(`Failed to upload files for line item ${parseInt(lineItemIndex) + 1}: ${errorMessage}`);
          }
        }
      });

      await Promise.all(uploadPromises);

      toast.success(isEditing ? 'Claim updated successfully!' : 'Claim submitted successfully!');
      if (!isEditing) {
        reset();
        setUploadedFiles({});
        setFileLabels({});
      }
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to submit claim';
      toast.error(errorMessage);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="w-full max-w-none mx-auto bg-white rounded-lg shadow-lg">
        <div className="flex justify-between items-center p-6 border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={onClose}
              className="flex items-center text-gray-600 hover:text-gray-800"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back
            </button>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isEditing ? 'Edit Claim' : 'Submit New Claim'}
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-4">
            <p>Employee ID: {employeeId || 'Not provided'}</p>
            <p>Line Items: {lineItemFields.length}</p>
            <p>Form Valid: {Object.keys(errors).length === 0 ? 'Yes' : 'No'}</p>
          </div>
          
          {/* File size limit notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  File Upload Limits
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>• Maximum file size: 4MB per file</p>
                  <p>• Total upload limit: 4MB per claim</p>
                  <p>• Only PDF files are allowed</p>
                  <p className="text-xs mt-1">These limits are set for Vercel free tier compatibility.</p>
                </div>
              </div>
            </div>
          </div>
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Unit
              </label>
              <Controller
                name="businessUnit"
                control={control}
                render={({ field }) => (
                  <select {...field} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {businessUnits.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                )}
              />
              {errors.businessUnit && (
                <p className="mt-1 text-sm text-red-600">{errors.businessUnit.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category
              </label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    value={selectedCategory}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    {categoryMaster.map(category => (
                      <option key={category.name} value={category.name}>{category.name}</option>
                    ))}
                  </select>
                )}
              />
              {errors.category && (
                <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
              )}
            </div>
          </div>

          {/* Line Items Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">
                Line Items ({lineItemFields.length}/15)
              </h4>
              {selectedCategory && lineItemFields.length === 0 && (
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line Item
                </button>
              )}
            </div>

            {lineItemFields.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Select a category to add line items</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lineItemFields.map((field, index) => (
                  <div key={field.id}>
                    <LineItemForm
                      index={index}
                      control={control}
                      errors={errors}
                      lineItem={field}
                      onRemove={() => removeLineItem(index)}
                      watch={watch}
                      setValue={setValue}
                      selectedCategory={selectedCategory}
                      handleFileUpload={handleFileUpload}
                      removeFile={removeFile}
                      uploadedFiles={uploadedFiles[index] || []}
                    />
                    {/* Add button below each line item */}
                    {index === lineItemFields.length - 1 && lineItemFields.length < 15 && (
                      <div className="mt-4 flex justify-center">
                        <button
                          type="button"
                          onClick={addLineItem}
                          className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Another Line Item
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Advances Section */}
          <div className="border-t pt-6">
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-lg font-medium text-gray-900">Advances</h4>
              <button
                type="button"
                onClick={() => appendAdvance({ date: new Date().toISOString().slice(0, 10), amount: 0 })}
                className="flex items-center px-4 py-2 text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Advance
              </button>
            </div>

            {advanceFields.map((field, index) => (
              <AdvanceForm
                key={field.id}
                index={index}
                control={control}
                errors={errors}
                onRemove={() => removeAdvance(index)}
              />
            ))}
          </div>

          {/* Totals Section */}
          <div className="border-t pt-6">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-gray-600">Grand Total</p>
                  <p className="text-2xl font-bold text-gray-900">₹{totals.grandTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Advances</p>
                  <p className="text-xl font-semibold text-green-600">₹{totals.advancesTotal.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Net Payable</p>
                  <p className="text-2xl font-bold text-blue-600">₹{totals.netPayable.toLocaleString()}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreatingClaim || isUpdatingClaim || isUploadingFiles || lineItemFields.length === 0 || !employeeId}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isCreatingClaim || isUpdatingClaim || isUploadingFiles ? (isEditing ? 'Updating...' : 'Submitting...') : (isEditing ? 'Update Claim' : 'Submit Claim')}
            </button>
          </div>
          
          {/* Validation Feedback */}
          {!employeeId && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Error: Employee ID is missing. Please refresh the page and try again.
              </p>
            </div>
          )}
          
          {lineItemFields.length === 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-600">
                Please add at least one line item to submit a claim.
              </p>
            </div>
          )}
          
          {Object.keys(errors).length > 0 && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600 font-medium">Please fix the following errors:</p>
              <ul className="mt-2 text-sm text-red-600">
                {Object.entries(errors).map(([field, error]: [string, any]) => (
                  <li key={field}>• {error?.message || 'Invalid field'}</li>
                ))}
              </ul>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

// Line Item Form Component
interface LineItemFormProps {
  index: number;
  control: any;
  errors: any;
  lineItem: any;
  onRemove: () => void;
  watch: any;
  setValue: any;
  selectedCategory: string;
  handleFileUpload: (files: FileList | null, lineItemIndex: number, event?: React.ChangeEvent<HTMLInputElement>) => void;
  removeFile: (lineItemIndex: number, fileIndex: number) => void;
  uploadedFiles: File[];
}

function LineItemForm({ 
  index, 
  control, 
  errors, 
  lineItem, 
  onRemove, 
  watch, 
  setValue, 
  selectedCategory,
  handleFileUpload,
  removeFile,
  uploadedFiles
}: LineItemFormProps) {
  const watchedCurrency = watch(`lineItems.${index}.currency`);
  const watchedAmount = watch(`lineItems.${index}.amount`);
  const watchedGstTotal = watch(`lineItems.${index}.gstTotal`);
  
  // Calculate total for this line item (ensure proper number conversion)
  const lineItemTotal = (Number(watchedAmount) || 0) + (Number(watchedGstTotal) || 0);
  
  // Update amount in INR when currency or amount changes
  useEffect(() => {
    const updateAmountInINR = async () => {
      if (lineItemTotal > 0 && watchedCurrency) {
        try {
          const result = await convertToINR(lineItemTotal, watchedCurrency);
          setValue(`lineItems.${index}.amountInINR`, result.inr);
        } catch (error) {
          console.error('Currency conversion error:', error);
          // Fallback to approximate rate
          const fallbackRate = watchedCurrency === 'USD' ? 75 : watchedCurrency === 'EUR' ? 85 : 1;
          setValue(`lineItems.${index}.amountInINR`, lineItemTotal * fallbackRate);
        }
      }
    };

    updateAmountInINR();
  }, [lineItemTotal, watchedCurrency, index, setValue]);

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h5 className="font-medium text-gray-900">Line Item {index + 1}</h5>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Basic fields in a single line */}
      <div className="grid grid-cols-2 md:grid-cols-7 gap-4 mb-4">
        <div>
          <Controller
            name={`lineItems.${index}.date`}
            control={control}
            render={({ field }) => (
              <input {...field} type="date" className="input" />
            )}
          />
          {errors.lineItems?.[index]?.date && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.date?.message}</p>
          )}
        </div>
        <div>
          <Controller
            name={`lineItems.${index}.subCategory`}
            control={control}
            render={({ field }) => (
              <select {...field} className="input">
                <option value="">Sub-category</option>
                {selectedCategory && getSubCategoriesForCategory(selectedCategory).map(sub => (
                  <option key={sub.name} value={sub.name}>{sub.name}</option>
                ))}
              </select>
            )}
          />
          {errors.lineItems?.[index]?.subCategory && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.subCategory?.message}</p>
          )}
        </div>
        <div>
          <Controller
            name={`lineItems.${index}.currency`}
            control={control}
            render={({ field }) => (
              <select {...field} className="input">
                {currencies.map(currency => (
                  <option key={currency} value={currency}>{currency}</option>
                ))}
              </select>
            )}
          />
          {errors.lineItems?.[index]?.currency && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.currency?.message}</p>
          )}
        </div>
        <div>
          <Controller
            name={`lineItems.${index}.amount`}
            control={control}
            render={({ field }) => (
              <input 
                {...field} 
                type="number" 
                step="0.01" 
                placeholder="Amount" 
                className="input"
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
          {errors.lineItems?.[index]?.amount && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.amount?.message}</p>
          )}
        </div>
        <div>
          <Controller
            name={`lineItems.${index}.gstTotal`}
            control={control}
            render={({ field }) => (
              <input 
                {...field} 
                type="number" 
                step="0.01" 
                placeholder="GST" 
                className="input"
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
          {errors.lineItems?.[index]?.gstTotal && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.gstTotal?.message}</p>
          )}
        </div>
        <div className="flex items-center justify-center">
          <span className="text-sm font-medium text-gray-700">
            Total: {formatCurrency(lineItemTotal, watchedCurrency || 'INR')}
          </span>
        </div>
        <div className="flex items-center justify-center">
          <span className="text-sm text-gray-600">
            INR: {formatCurrency(watch(`lineItems.${index}.amountInINR`) || 0, 'INR')}
          </span>
        </div>
      </div>

      {/* Description and file upload in same row */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="col-span-2">
          <Controller
            name={`lineItems.${index}.description`}
            control={control}
            render={({ field }) => (
              <textarea {...field} placeholder="Description" rows={2} className="input" />
            )}
          />
          {errors.lineItems?.[index]?.description && (
            <p className="text-xs text-red-600 mt-1">{errors.lineItems[index]?.description?.message}</p>
          )}
        </div>
        <div className="flex flex-col space-y-2">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              handleFileUpload(e.target.files, index, e);
              // Reset the input value to allow re-uploading the same file
              e.target.value = '';
            }}
            className="hidden"
            id={`file-upload-${index}`}
          />
          <label
            htmlFor={`file-upload-${index}`}
            className="flex flex-col items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors cursor-pointer w-full justify-center"
          >
            <div className="flex items-center">
              <Upload className="h-4 w-4 mr-1" />
              Upload PDF
            </div>
            <span className="text-xs text-blue-600 mt-1">Max 4MB</span>
          </label>
          
          {/* Display uploaded files */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-1">
              {uploadedFiles.map((file, fileIndex) => (
                <div key={fileIndex} className="flex items-center justify-between bg-gray-50 p-2 rounded text-xs">
                  <span className="truncate flex-1">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => removeFile(index, fileIndex)}
                    className="text-red-500 hover:text-red-700 ml-2"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Advance Form Component
interface AdvanceFormProps {
  index: number;
  control: any;
  errors: any;
  onRemove: () => void;
}

function AdvanceForm({ index, control, errors, onRemove }: AdvanceFormProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h5 className="font-medium text-gray-900">Advance {index + 1}</h5>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Controller
          name={`advances.${index}.date`}
          control={control}
          render={({ field }) => (
            <input {...field} type="date" className="input" />
          )}
        />
        <Controller
          name={`advances.${index}.refNo`}
          control={control}
          render={({ field }) => (
            <input {...field} placeholder="Reference No (Optional)" className="input" />
          )}
        />
        <Controller
          name={`advances.${index}.amount`}
          control={control}
          render={({ field }) => (
            <input {...field} type="number" step="0.01" placeholder="Amount" className="input" />
          )}
        />
      </div>
    </div>
  );
}
