'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useGetPolicyQuery, useUpdatePolicyMutation } from '@/lib/api';
import { policySchema, type Policy } from '@/lib/schemas';
import { 
  Save, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle,
  Settings,
  DollarSign,
  FileText,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PolicyManager() {
  const { data: currentPolicy, isLoading } = useGetPolicyQuery();
  const [updatePolicy] = useUpdatePolicyMutation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty }
  } = useForm<Policy>({
    resolver: zodResolver(policySchema),
    defaultValues: {
      version: 'v1.0',
      mileageRate: 12,
      cityClasses: ['A', 'B', 'C'],
      mealCaps: {
        A: { breakfast: 200, lunch: 350, dinner: 500, snack: 150 },
        B: { breakfast: 150, lunch: 300, dinner: 400, snack: 120 },
        C: { breakfast: 120, lunch: 250, dinner: 350, snack: 100 }
      },
      lodgingCaps: { A: 4000, B: 3000, C: 2000 },
      requiredDocuments: {
        flight: ['airline_invoice', 'mmt_invoice'],
        train: ['ticket', 'payment_proof'],
        local_travel: ['receipt_or_reason'],
        meal: ['restaurant_bill'],
        lodging: ['hotel_invoice'],
        client_entertainment: ['bill_or_proof'],
        mileage: ['route_or_log'],
        admin_misc: ['supporting_doc']
      },
      adminSubCategories: ['printout', 'repairs', 'filing', 'others'],
      rulesBehavior: { 
        missingDocuments: 'hard', 
        capExceeded: 'soft' 
      }
    }
  });

  // Reset form when policy loads
  useState(() => {
    if (currentPolicy) {
      reset(currentPolicy);
    }
  });

  const onSubmit = async (data: Policy) => {
    try {
      setIsSubmitting(true);
      await updatePolicy(data).unwrap();
      toast.success('Policy updated successfully!');
    } catch (error: any) {
      console.error('Policy update error:', error);
      toast.error(error.data?.message || 'Failed to update policy');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    if (currentPolicy) {
      reset(currentPolicy);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading policy...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="h-6 w-6 mr-2" />
            Policy Management
          </h1>
          <p className="text-gray-600 mt-1">Configure reimbursement policies and rules</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
          {/* Basic Settings */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Basic Settings
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Version
                </label>
                <Controller
                  name="version"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="v1.0"
                    />
                  )}
                />
                {errors.version && (
                  <p className="text-red-600 text-sm mt-1">{errors.version.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mileage Rate (₹/km)
                </label>
                <Controller
                  name="mileageRate"
                  control={control}
                  render={({ field }) => (
                    <input
                      {...field}
                      type="number"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="12"
                    />
                  )}
                />
                {errors.mileageRate && (
                  <p className="text-red-600 text-sm mt-1">{errors.mileageRate.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Meal Caps */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Meal Caps by City Class
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {['A', 'B', 'C'].map((cityClass) => (
                <div key={cityClass} className="space-y-3">
                  <h4 className="font-medium text-gray-900">Class {cityClass}</h4>
                  {['breakfast', 'lunch', 'dinner', 'snack'].map((mealType) => (
                    <div key={mealType}>
                      <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                        {mealType}
                      </label>
                      <Controller
                        name={`mealCaps.${cityClass}.${mealType}`}
                        control={control}
                        render={({ field }) => (
                          <input
                            {...field}
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        )}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Lodging Caps */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Lodging Caps by City Class</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['A', 'B', 'C'].map((cityClass) => (
                <div key={cityClass}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Class {cityClass}
                  </label>
                  <Controller
                    name={`lodgingCaps.${cityClass}`}
                    control={control}
                    render={({ field }) => (
                      <input
                        {...field}
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0"
                      />
                    )}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Required Documents */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Required Documents by Line Type
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                'flight', 'train', 'local_travel', 'meal', 
                'lodging', 'client_entertainment', 'mileage', 'admin_misc'
              ].map((lineType) => (
                <div key={lineType}>
                  <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                    {lineType.replace('_', ' ')}
                  </label>
                  <Controller
                    name={`requiredDocuments.${lineType}`}
                    control={control}
                    render={({ field }) => (
                      <textarea
                        {...field}
                        value={field.value?.join(', ') || ''}
                        onChange={(e) => {
                          const documents = e.target.value
                            .split(',')
                            .map(doc => doc.trim())
                            .filter(doc => doc.length > 0);
                          field.onChange(documents);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="document1, document2, document3"
                        rows={3}
                      />
                    )}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Comma-separated list of required documents
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Sub Categories */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Admin Misc Sub Categories</h3>
            
            <Controller
              name="adminSubCategories"
              control={control}
              render={({ field }) => (
                <textarea
                  {...field}
                  value={field.value?.join(', ') || ''}
                  onChange={(e) => {
                    const categories = e.target.value
                      .split(',')
                      .map(cat => cat.trim())
                      .filter(cat => cat.length > 0);
                    field.onChange(categories);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="printout, repairs, filing, others"
                  rows={3}
                />
              )}
            />
            <p className="text-xs text-gray-500 mt-1">
              Comma-separated list of admin misc sub categories
            </p>
          </div>

          {/* Rules Behavior */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Rules Behavior</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Missing Documents
                </label>
                <Controller
                  name="rulesBehavior.missingDocuments"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hard">Hard (Block submission)</option>
                      <option value="soft">Soft (Allow with warning)</option>
                    </select>
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cap Exceeded
                </label>
                <Controller
                  name="rulesBehavior.capExceeded"
                  control={control}
                  render={({ field }) => (
                    <select
                      {...field}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="hard">Hard (Block submission)</option>
                      <option value="soft">Soft (Allow with warning)</option>
                    </select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className="h-4 w-4 mr-2 inline" />
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !isDirty}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2 inline" />
                  Save Policy
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
