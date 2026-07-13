'use client';

import { MapPin, Home, DollarSign, Utensils, Train, Info } from 'lucide-react';

export default function TravelGuidelines() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center space-x-3">
          <MapPin className="h-8 w-8" />
          <div>
            <h2 className="text-2xl font-bold">Tiered Per-Diem Travel Guidelines</h2>
            <p className="text-blue-100 text-sm mt-1">Official travel policy for all employees</p>
          </div>
        </div>
      </div>

      {/* Accommodation Guidelines */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-blue-100 rounded-lg"><Home className="h-5 w-5 text-blue-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Accommodation Guidelines</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>Airbnb is the <strong>preferred accommodation platform</strong> for official travel. Employees are encouraged to book <strong>"Guest Favorite"</strong> or <strong>"Superhost"</strong> properties wherever feasible.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-500 mt-1">•</span>
            <span>For <strong>group travel</strong>, it is recommended that each employee has a separate bedroom (e.g., a 2BHK property for two employees).</span>
          </li>
        </ul>
      </div>

      {/* Suggested Accommodation Budget Limits */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-indigo-100 rounded-lg"><DollarSign className="h-5 w-5 text-indigo-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Suggested Accommodation Budget Limits</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mumbai */}
          <div className="border border-blue-200 rounded-lg p-4 bg-blue-50">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="h-4 w-4 text-blue-600" />
              <h4 className="font-semibold text-blue-800 text-base">Mumbai</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-blue-100">
                <span className="text-sm text-gray-700">1BHK / Single Room (1 person)</span>
                <span className="font-semibold text-blue-700">₹4,000 / night</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-blue-100">
                <span className="text-sm text-gray-700">2BHK</span>
                <span className="font-semibold text-blue-700">₹7,000 / night</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-700">3BHK</span>
                <span className="font-semibold text-blue-700">₹9,000 / night</span>
              </div>
            </div>
          </div>
          {/* Other Cities */}
          <div className="border border-indigo-200 rounded-lg p-4 bg-indigo-50">
            <div className="flex items-center space-x-2 mb-3">
              <MapPin className="h-4 w-4 text-indigo-600" />
              <h4 className="font-semibold text-indigo-800 text-base">Other Cities</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-1 border-b border-indigo-100">
                <span className="text-sm text-gray-700">1BHK / Single Room (1 person)</span>
                <span className="font-semibold text-indigo-700">₹3,000 / night</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-indigo-100">
                <span className="text-sm text-gray-700">2BHK</span>
                <span className="font-semibold text-indigo-700">₹5,500 / night</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-sm text-gray-700">3BHK</span>
                <span className="font-semibold text-indigo-700">₹7,500 / night</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Food Expenses */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-green-100 rounded-lg"><Utensils className="h-5 w-5 text-green-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Food Expenses</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">•</span>
            <span>Employees may claim reimbursement up to <strong className="text-green-700">₹750 per day</strong> for food expenses.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-500 mt-1">•</span>
            <span>This <strong>excludes</strong> partner, customer, or external entertainment expenses.</span>
          </li>
        </ul>
      </div>

      {/* Incidental Allowance */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-yellow-100 rounded-lg"><DollarSign className="h-5 w-5 text-yellow-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Incidental Allowance – Coimbatore Office Travel</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-yellow-500 mt-1">•</span>
            <span>Employees travelling to the <strong>Coimbatore office</strong> may claim a fixed incidental allowance of <strong className="text-yellow-700">₹5,000</strong>.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-yellow-500 mt-1">•</span>
            <span><strong>Bills are not required</strong> for this allowance.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-yellow-500 mt-1">•</span>
            <span>Reimbursement will be processed upon submission of travel confirmation through <strong>email or the expense management system</strong>.</span>
          </li>
        </ul>
      </div>

      {/* Preferred Travel Mode */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg"><Train className="h-5 w-5 text-purple-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Preferred Travel Mode</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-purple-500 mt-1">•</span>
            <span>For travel between <strong>Chennai and Bangalore</strong>, employees are encouraged to prefer <strong className="text-purple-700">train travel over flights</strong> wherever practical and feasible.</span>
          </li>
        </ul>
      </div>

      {/* Chennai & Coimbatore Travel Budget */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-amber-100 rounded-lg"><DollarSign className="h-5 w-5 text-amber-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">Chennai & Coimbatore Travel Budget</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-amber-500 mt-1">•</span>
            <span>Between <strong>Chennai & Coimbatore</strong>, the maximum travel approval budget is <strong className="text-amber-700">₹5,000/-</strong> (inclusive of accommodation & travel, per day).</span>
          </li>
        </ul>
      </div>

      {/* General Guidelines */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-gray-100 rounded-lg"><Info className="h-5 w-5 text-gray-600" /></div>
          <h3 className="text-lg font-semibold text-gray-900">General Guidelines</h3>
        </div>
        <ul className="space-y-2 text-gray-700">
          <li className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <span>Employees are expected to make <strong>reasonable, cost-effective, and business-appropriate</strong> travel decisions.</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-gray-400 mt-1">•</span>
            <span>Exceptions may be approved based on <strong>business requirements, availability, or special travel conditions</strong>.</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
