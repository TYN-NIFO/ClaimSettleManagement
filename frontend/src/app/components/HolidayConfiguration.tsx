'use client';

import { useState } from 'react';
import {
    useGetHolidaysQuery,
    useCreateHolidayMutation,
    useUpdateHolidayMutation,
    useDeleteHolidayMutation,
} from '../../lib/api';
import toast from 'react-hot-toast';
import { Edit, Trash2, Calendar, Plus, X, AlertCircle } from 'lucide-react';
import LoadingSpinner from './LoadingSpinner';

export default function HolidaysManager() {
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(currentYear);
    const [showModal, setShowModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<any | null>(null);

    // Form State
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [isFlexi, setIsFlexi] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [holidayToDelete, setHolidayToDelete] = useState<string | null>(null);

    // Queries & Mutations
    const { data: holidays, isLoading, refetch } = useGetHolidaysQuery({ year: selectedYear });
    const [createHoliday, { isLoading: isCreating }] = useCreateHolidayMutation();
    const [updateHoliday, { isLoading: isUpdating }] = useUpdateHolidayMutation();
    const [deleteHoliday, { isLoading: isDeleting }] = useDeleteHolidayMutation();

    const handleOpenModal = (holiday?: any) => {
        if (holiday) {
            setEditingHoliday(holiday);
            setName(holiday.name);
            setDate(new Date(holiday.date).toISOString().split('T')[0]);
            setIsFlexi(holiday.isFlexi);
        } else {
            setEditingHoliday(null);
            setName('');
            setDate('');
            setIsFlexi(false);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingHoliday(null);
        setName('');
        setDate('');
        setIsFlexi(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingHoliday) {
                await updateHoliday({
                    id: editingHoliday._id,
                    name,
                    date,
                    isFlexi
                }).unwrap();
                toast.success('Holiday updated successfully!');
            } else {
                await createHoliday({
                    name,
                    date,
                    isFlexi
                }).unwrap();
                toast.success('Holiday created successfully!');
            }
            handleCloseModal();
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.error || 'Failed to save holiday');
        }
    };

    const handleDeleteClick = (id: string) => {
        setHolidayToDelete(id);
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!holidayToDelete) return;

        try {
            await deleteHoliday(holidayToDelete).unwrap();
            toast.success('Holiday deleted successfully');
            setShowDeleteModal(false);
            setHolidayToDelete(null);
            refetch();
        } catch (error: any) {
            toast.error(error?.data?.error || 'Failed to delete holiday');
            setShowDeleteModal(false);
            setHolidayToDelete(null);
        }
    };

    return (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center border-b border-gray-200">
                <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                        <Calendar className="mr-2 h-5 w-5 text-gray-400" />
                        Holiday Management
                    </h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Configure normal and flexible holidays.
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm p-2 bg-gray-50 border"
                    >
                        {Array.from({ length: 11 }, (_, i) => currentYear - 5 + i).map((year) => (
                            <option key={year} value={year}>
                                {year}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => handleOpenModal()}
                        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Holiday
                    </button>
                </div>
            </div>

            <div className="p-4">
                {isLoading ? (
                    <div className="flex justify-center py-10">
                        <LoadingSpinner />
                    </div>
                ) : holidays && holidays.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 border border-gray-100 rounded-lg">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Holiday Name
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {holidays.map((holiday: any) => (
                                    <tr key={holiday._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(holiday.date).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-l border-r border-gray-100">
                                            <div className="flex items-center space-x-2">
                                                <span>{holiday.name}</span>
                                                {holiday.isFlexi && (
                                                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                                                        Flexi
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <button
                                                onClick={() => handleOpenModal(holiday)}
                                                className="text-blue-600 hover:text-blue-900 mr-4 transition-colors"
                                            >
                                                <Edit className="h-4 w-4 inline" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(holiday._id)}
                                                disabled={isDeleting}
                                                className="text-red-600 hover:text-red-900 disabled:opacity-50 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4 inline" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <Calendar className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">No holidays</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            No holidays configured for {selectedYear}. Get started by adding a new one.
                        </p>
                    </div>
                )}
            </div>

            {/* Holiday Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                            <h3 className="text-lg leading-6 font-medium text-gray-900">
                                {editingHoliday ? 'Edit Holiday' : 'Add New Holiday'}
                            </h3>
                            <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-500 transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Holiday Name</label>
                                <input
                                    type="text"
                                    required
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. New Year's Day"
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Date</label>
                                <input
                                    type="date"
                                    required
                                    value={date}
                                    onChange={(e) => setDate(e.target.value)}
                                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                />
                            </div>

                            <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium text-gray-900">Flexi Holiday</span>
                                    <span className="text-xs text-gray-500">Toggle if this is an optional holiday.</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsFlexi(!isFlexi)}
                                    className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${isFlexi ? 'bg-purple-600' : 'bg-gray-200'
                                        }`}
                                >
                                    <span
                                        className={`pointer-events-none display-inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200 ${isFlexi ? 'translate-x-5' : 'translate-x-0'
                                            }`}
                                    />
                                </button>
                            </div>

                            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || isUpdating}
                                    className="bg-blue-600 border border-transparent rounded-md shadow-sm py-2 px-4 inline-flex justify-center text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                                >
                                    {(isCreating || isUpdating) ? 'Saving...' : 'Save Holiday'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 transition-opacity" aria-hidden="true" onClick={() => setShowDeleteModal(false)}>
                            <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
                        </div>

                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>

                        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
                            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                <div className="sm:flex sm:items-start">
                                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                                        <AlertCircle className="h-6 w-6 text-red-600" aria-hidden="true" />
                                    </div>
                                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                                        <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                                            Delete Holiday
                                        </h3>
                                        <div className="mt-2">
                                            <p className="text-sm text-gray-500">
                                                Are you sure you want to delete this holiday? This action cannot be undone and it will be removed from all organizational calendars immediately.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={confirmDelete}
                                    disabled={isDeleting}
                                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {isDeleting ? 'Deleting...' : 'Delete'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteModal(false)}
                                    disabled={isDeleting}
                                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
