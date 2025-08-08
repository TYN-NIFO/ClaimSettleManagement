'use client';

import { useState, useCallback } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { 
  useCreateClaimMutation, 
  useUploadClaimFilesMutation, 
  useGetPolicyQuery 
} from '@/lib/api';
import { 
  claimSchema, 
  lineItemSchema,
  lineItemTypes,
  mealTypes,
  travelModes,
  cityClasses,
  categories,
  accountHeads,
  type Claim,
  type LineItem
} from '@/lib/schemas';
import { 
  Plus, 
  X, 
  Upload, 
  FileText, 
  AlertCircle,
  CheckCircle,
  DollarSign,
  Calendar,
  MapPin,
  Users,
  Building
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ClaimBuilderProps {
  onSuccess?: (claimId: string) => void;
  onCancel?: () => void;
}

export default function ClaimBuilder({ onSuccess, onCancel }: ClaimBuilderProps) {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);
  const [createClaim] = useCreateClaimMutation();
  const [uploadFiles] = useUploadClaimFilesMutation();
  const { data: policy } = useGetPolicyQuery();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileLabels, setFileLabels] = useState<string[]>([]);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isValid }
  } = useForm<Claim>({
    resolver: zodResolver(claimSchema),
    defaultValues: {
      category: 'Alliance',
      accountHead: 'Business Travel',
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

  const watchedLineItems = watch('lineItems');

  // Add line item
  const addLineItem = useCallback((type: string) => {
    const newLineItem: Partial<LineItem> = {
      type: type as any,
      date: new Date(),
      amount: 0
    };

    // Set type-specific defaults
    switch (type) {
      case 'mileage':
        newLineItem.kilometers = 0;
        break;
      case 'lodging':
        newLineItem.checkIn = new Date();
        newLineItem.checkOut = new Date();
        newLineItem.nights = 1;
        break;
      case 'meal':
        newLineItem.mealType = 'lunch';
        break;
      case 'local_travel':
        newLineItem.mode = 'auto';
        break;
    }

    appendLineItem(newLineItem as LineItem);
  }, [appendLineItem]);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const lineItems = watch('lineItems');
    const advances = watch('advances');
    
    const grandTotal = lineItems.reduce((sum, item) => sum + (item.amount || 0), 0);
    const advancesTotal = advances.reduce((sum, advance) => sum + (advance.amount || 0), 0);
    const netPayable = grandTotal - advancesTotal;
    
    return { grandTotal, advancesTotal, netPayable };
  }, [watch]);

  // Handle file upload
  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    
    const newFiles = Array.from(files);
    setUploadedFiles(prev => [...prev, ...newFiles]);
    setFileLabels(prev => [...prev, ...newFiles.map(() => 'supporting_doc')]);
  }, []);

  // Handle file label change
  const handleFileLabelChange = useCallback((index: number, label: string) => {
    setFileLabels(prev => {
      const newLabels = [...prev];
      newLabels[index] = label;
      return newLabels;
    });
  }, []);

  // Remove file
  const removeFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
    setFileLabels(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Submit claim
  const onSubmit = async (data: Claim) => {
    try {
      setIsSubmitting(true);
      
      // Create claim
      const result = await createClaim(data).unwrap();
      
      // Upload files if any
      if (uploadedFiles.length > 0 && result.claimId) {
        // Group files by line item (for now, attach to first line item)
        const lineItemId = result.claim.lineItems[0]?._id;
        if (lineItemId) {
          await uploadFiles({
            claimId: result.claimId,
            lineItemId,
            files: uploadedFiles,
            labels: fileLabels
          });
        }
      }

      toast.success('Claim submitted successfully!');
      onSuccess?.(result.claimId);
      router.push('/employee');
    } catch (error: any) {
      console.error('Claim submission error:', error);
      toast.error(error.data?.message || 'Failed to submit claim');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Create New Claim</h1>
          <p className="text-gray-600 mt-1">Submit your expense claim with line items and supporting documents</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.category && (
                <p className="text-red-600 text-sm mt-1">{errors.category.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Head
              </label>
              <Controller
                name="accountHead"
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {accountHeads.map(head => (
                      <option key={head.value} value={head.value}>
                        {head.label}
                      </option>
                    ))}
                  </select>
                )}
              />
              {errors.accountHead && (
                <p className="text-red-600 text-sm mt-1">{errors.accountHead.message}</p>
              )}
            </div>
          </div>

          {/* Trip Information */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Trip Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Purpose
                </label>
                <Controller
                  name="trip.purpose"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Business purpose"
                    />
                  )}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City Class
                </label>
                <Controller
                  name="trip.cityClass"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select City Class</option>
                      {cityClasses.map(cls => (
                        <option key={cls.value} value={cls.value}>
                          {cls.label}
                        </option>
                      ))}
                    </select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Advances */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Advances
              </h3>
              <button
                type="button"
                onClick={() => appendAdvance({ date: new Date(), amount: 0 })}
                className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Advance
              </button>
            </div>
            
            {advanceFields.map((field, index) => (
              <div key={field.id} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date
                  </label>
                  <Controller
                    name={`advances.${index}.date`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reference No.
                  </label>
                  <Controller
                    name={`advances.${index}.refNo`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Reference number"
                      />
                    )}
                  />
                </div>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <Controller
                      name={`advances.${index}.amount`}
                      control={control}
                      render={({ field }) => (
                        <input
                          {...field}
                          type="number"
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="0.00"
                        />
                      )}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdvance(index)}
                    className="p-2 text-red-600 hover:text-red-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Line Items */}
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Line Items
              </h3>
              <div className="flex space-x-2">
                {lineItemTypes.map(type => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => addLineItem(type.value)}
                    className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {lineItemFields.map((field, index) => (
              <LineItemForm
                key={field.id}
                index={index}
                control={control}
                errors={errors}
                lineItem={watchedLineItems[index]}
                policy={policy}
                onRemove={() => removeLineItem(index)}
              />
            ))}
          </div>

          {/* File Upload */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Supporting Documents
            </h3>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={(e) => handleFileUpload(e.target.files)}
                className="hidden"
                id="file-upload"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Click to upload files or drag and drop</p>
                <p className="text-sm text-gray-500 mt-1">PDF, Images, Documents (max 10MB each)</p>
              </label>
            </div>

            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <FileText className="h-5 w-5 text-gray-500" />
                      <span className="text-sm font-medium">{file.name}</span>
                      <span className="text-xs text-gray-500">
                        ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <select
                        value={fileLabels[index] || 'supporting_doc'}
                        onChange={(e) => handleFileLabelChange(index, e.target.value)}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="supporting_doc">Supporting Doc</option>
                        <option value="airline_invoice">Airline Invoice</option>
                        <option value="mmt_invoice">MMT Invoice</option>
                        <option value="ticket">Ticket</option>
                        <option value="payment_proof">Payment Proof</option>
                        <option value="receipt_or_reason">Receipt/Reason</option>
                        <option value="restaurant_bill">Restaurant Bill</option>
                        <option value="hotel_invoice">Hotel Invoice</option>
                        <option value="bill_or_proof">Bill/Proof</option>
                        <option value="route_or_log">Route/Log</option>
                      </select>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Totals */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Grand Total</p>
                <p className="text-2xl font-bold text-gray-900">₹{totals.grandTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Advances Total</p>
                <p className="text-2xl font-bold text-blue-600">₹{totals.advancesTotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Net Payable</p>
                <p className="text-2xl font-bold text-green-600">₹{totals.netPayable.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
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
  policy: any;
  onRemove: () => void;
}

function LineItemForm({ index, control, errors, lineItem, policy, onRemove }: LineItemFormProps) {
  if (!lineItem) return null;

  const renderTypeSpecificFields = () => {
    switch (lineItem.type) {
      case 'flight':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <Controller
                name={`lineItems.${index}.from`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Departure city"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <Controller
                name={`lineItems.${index}.to`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Destination city"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Airline</label>
              <Controller
                name={`lineItems.${index}.airline`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Airline name"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PNR</label>
              <Controller
                name={`lineItems.${index}.pnr`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="PNR number"
                  />
                )}
              />
            </div>
          </div>
        );

      case 'meal':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Meal Type</label>
              <Controller
                name={`lineItems.${index}.mealType`}
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {mealTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
              <Controller
                name={`lineItems.${index}.city`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="City name"
                  />
                )}
              />
            </div>
          </div>
        );

      case 'local_travel':
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mode</label>
              <Controller
                name={`lineItems.${index}.mode`}
                control={control}
                render={({ field }) => (
                  <select
                    {...field}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {travelModes.map(mode => (
                      <option key={mode.value} value={mode.value}>
                        {mode.label}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
              <Controller
                name={`lineItems.${index}.from`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="From location"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
              <Controller
                name={`lineItems.${index}.to`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="To location"
                  />
                )}
              />
            </div>
          </div>
        );

      case 'mileage':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Kilometers</label>
              <Controller
                name={`lineItems.${index}.kilometers`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Distance in km"
                  />
                )}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Amount (₹{policy?.mileageRate || 12}/km)
              </label>
              <Controller
                name={`lineItems.${index}.amount`}
                control={control}
                render={({ field }) => (
                  <input
                    {...field}
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Calculated amount"
                    readOnly
                  />
                )}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-lg font-medium text-gray-900">
          {lineItemTypes.find(t => t.value === lineItem.type)?.label} - Line {index + 1}
        </h4>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-600 hover:text-red-800"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <Controller
            name={`lineItems.${index}.date`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="date"
                value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
          <Controller
            name={`lineItems.${index}.amount`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="number"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            )}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <Controller
            name={`lineItems.${index}.notes`}
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Additional notes"
              />
            )}
          />
        </div>
      </div>

      {renderTypeSpecificFields()}

      {/* Required Documents */}
      {policy && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h5 className="text-sm font-medium text-blue-900 mb-2">Required Documents</h5>
          <div className="flex flex-wrap gap-2">
            {policy.requiredDocuments[lineItem.type]?.map((doc: string) => (
              <span
                key={doc}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                <FileText className="h-3 w-3 mr-1" />
                {doc.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
