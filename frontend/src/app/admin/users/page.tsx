'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RootState } from '@/lib/store';
import { useGetUsersQuery, useCreateUserMutation, useUpdateUserMutation, useDeactivateUserMutation, useResetUserPasswordMutation } from '@/lib/api';
import { UserPlus, Trash2, Eye, Edit, Key, Menu, X, Users, Settings, FileText, CreditCard, Plus } from 'lucide-react';
import toast from 'react-hot-toast';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  createdAt: string;
  supervisorLevel?: number;
}

interface CreateUserForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
  department: string;
  supervisorLevel?: number;
}

interface EditUserForm {
  name: string;
  email: string;
  role: string;
  department: string;
  supervisorLevel?: number;
}

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

interface FormErrors {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  department?: string;
  supervisorLevel?: string;
}

type DrawerMode = 'create' | 'edit' | 'view' | 'reset-password' | null;

export default function UserManagement() {
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [createForm, setCreateForm] = useState<CreateUserForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'employee',
    department: ''
  });
  
  const [editForm, setEditForm] = useState<EditUserForm>({
    name: '',
    email: '',
    role: 'employee',
    department: ''
  });
  
  const [resetPasswordForm, setResetPasswordForm] = useState<ResetPasswordForm>({
    password: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  // RTK Query hooks
  const { data: users = [], isLoading } = useGetUsersQuery({});
  const [createUser] = useCreateUserMutation();
  const [updateUser] = useUpdateUserMutation();
  const [deactivateUser] = useDeactivateUserMutation();
  const [resetPassword] = useResetUserPasswordMutation();

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation function for create form
  const validateCreateForm = (): boolean => {
    const errors: FormErrors = {};

    if (!createForm.name.trim()) {
      errors.name = 'Name is required';
    } else if (createForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!createForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(createForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!createForm.password) {
      errors.password = 'Password is required';
    } else if (createForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!createForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (createForm.password !== createForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (!createForm.department.trim()) {
      errors.department = 'Department is required';
    }

    if (createForm.role === 'supervisor' && (!createForm.supervisorLevel || createForm.supervisorLevel < 1 || createForm.supervisorLevel > 2)) {
      errors.supervisorLevel = 'Supervisor level must be 1 or 2';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validation function for edit form
  const validateEditForm = (): boolean => {
    const errors: FormErrors = {};

    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    } else if (editForm.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else if (!emailRegex.test(editForm.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!editForm.department.trim()) {
      errors.department = 'Department is required';
    }

    if (editForm.role === 'supervisor' && (!editForm.supervisorLevel || editForm.supervisorLevel < 1 || editForm.supervisorLevel > 2)) {
      errors.supervisorLevel = 'Supervisor level must be 1 or 2';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Validation function for reset password form
  const validateResetPasswordForm = (): boolean => {
    const errors: FormErrors = {};

    if (!resetPasswordForm.password) {
      errors.password = 'Password is required';
    } else if (resetPasswordForm.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (!resetPasswordForm.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting) return;
    
    if (!validateCreateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userData = {
        name: createForm.name.trim(),
        email: createForm.email.trim().toLowerCase(),
        password: createForm.password,
        role: createForm.role,
        department: createForm.department.trim(),
        supervisorLevel: createForm.role === 'supervisor' ? createForm.supervisorLevel : undefined
      };

      await createUser(userData).unwrap();
      closeDrawer();
      setCreateForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'employee',
        department: ''
      });
      setFormErrors({});
      toast.success('User created successfully!');
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast.error(error?.data?.error || 'Error creating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !selectedUser) return;
    
    if (!validateEditForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userData = {
        name: editForm.name.trim(),
        email: editForm.email.trim().toLowerCase(),
        role: editForm.role,
        department: editForm.department.trim(),
        supervisorLevel: editForm.role === 'supervisor' ? editForm.supervisorLevel : undefined
      };

      await updateUser({ id: selectedUser._id, ...userData }).unwrap();
      closeDrawer();
      setSelectedUser(null);
      setFormErrors({});
      toast.success('User updated successfully!');
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error(error?.data?.error || 'Error updating user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSubmitting || !selectedUser) return;
    
    if (!validateResetPasswordForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await resetPassword({ id: selectedUser._id, password: resetPasswordForm.password }).unwrap();
      closeDrawer();
      setSelectedUser(null);
      setResetPasswordForm({ password: '', confirmPassword: '' });
      setFormErrors({});
      toast.success('Password reset successfully!');
    } catch (error: any) {
      console.error('Error resetting password:', error);
      toast.error(error?.data?.error || 'Error resetting password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    
    try {
      await deactivateUser(userId).unwrap();
      toast.success('User deactivated successfully!');
    } catch (error: any) {
      console.error('Error deactivating user:', error);
      toast.error(error?.data?.error || 'Error deactivating user');
    }
  };

  const openDrawer = (mode: DrawerMode, user?: User) => {
    console.log('openDrawer called with mode:', mode, 'user:', user);
    setDrawerMode(mode);
    setSelectedUser(user || null);
    
    if (mode === 'create') {
      setCreateForm({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'employee',
        department: ''
      });
    } else if (mode === 'edit' && user) {
      setEditForm({
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department || '',
        supervisorLevel: user.supervisorLevel
      });
    } else if (mode === 'reset-password') {
      setResetPasswordForm({ password: '', confirmPassword: '' });
    }
    
    setFormErrors({});
    setDrawerOpen(true);
    console.log('Drawer should now be open with mode:', mode);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setDrawerMode(null);
    setSelectedUser(null);
    setFormErrors({});
  };

  const handleInputChange = (form: 'create' | 'edit' | 'reset', field: string, value: string | number) => {
    if (form === 'create') {
      setCreateForm(prev => ({ ...prev, [field]: value }));
    } else if (form === 'edit') {
      setEditForm(prev => ({ ...prev, [field]: value }));
    } else if (form === 'reset') {
      setResetPasswordForm(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear error when user starts typing
    if (formErrors[field as keyof FormErrors]) {
      setFormErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/admin', icon: Settings },
    { name: 'Users', href: '/admin/users', icon: Users, active: true },
    { name: 'Claims', href: '/admin/claims', icon: FileText },
    { name: 'Finance', href: '/finance', icon: CreditCard },
  ];

  const getDrawerTitle = () => {
    switch (drawerMode) {
      case 'create':
        return 'Add New User';
      case 'edit':
        return 'Edit User';
      case 'view':
        return 'View User Details';
      case 'reset-password':
        return `Reset Password for ${selectedUser?.name}`;
      default:
        return '';
    }
  };

  const renderDrawerContent = () => {
    switch (drawerMode) {
      case 'create':
        return (
          <form onSubmit={handleCreateUser} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                value={createForm.name}
                onChange={(e) => handleInputChange('create', 'name', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => handleInputChange('create', 'email', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password *</label>
              <input
                type="password"
                required
                value={createForm.password}
                onChange={(e) => handleInputChange('create', 'password', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Minimum 6 characters"
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password *</label>
              <input
                type="password"
                required
                value={createForm.confirmPassword}
                onChange={(e) => handleInputChange('create', 'confirmPassword', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={createForm.role}
                onChange={(e) => handleInputChange('create', 'role', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department *</label>
              <input
                type="text"
                required
                value={createForm.department}
                onChange={(e) => handleInputChange('create', 'department', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.department ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter department"
              />
              {formErrors.department && (
                <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
              )}
            </div>
            {createForm.role === 'supervisor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Supervisor Level *</label>
                <select
                  value={createForm.supervisorLevel || 1}
                  onChange={(e) => handleInputChange('create', 'supervisorLevel', parseInt(e.target.value))}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.supervisorLevel ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                </select>
                {formErrors.supervisorLevel && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.supervisorLevel}</p>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </form>
        );

      case 'edit':
        return (
          <form onSubmit={handleEditUser} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => handleInputChange('edit', 'name', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter full name"
              />
              {formErrors.name && (
                <p className="mt-1 text-sm text-red-600">{formErrors.name}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email *</label>
              <input
                type="email"
                required
                value={editForm.email}
                onChange={(e) => handleInputChange('edit', 'email', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter email address"
              />
              {formErrors.email && (
                <p className="mt-1 text-sm text-red-600">{formErrors.email}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role *</label>
              <select
                value={editForm.role}
                onChange={(e) => handleInputChange('edit', 'role', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="employee">Employee</option>
                <option value="supervisor">Supervisor</option>
                <option value="finance_manager">Finance Manager</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department *</label>
              <input
                type="text"
                required
                value={editForm.department}
                onChange={(e) => handleInputChange('edit', 'department', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.department ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter department"
              />
              {formErrors.department && (
                <p className="mt-1 text-sm text-red-600">{formErrors.department}</p>
              )}
            </div>
            {editForm.role === 'supervisor' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Supervisor Level *</label>
                <select
                  value={editForm.supervisorLevel || 1}
                  onChange={(e) => handleInputChange('edit', 'supervisorLevel', parseInt(e.target.value))}
                  className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                    formErrors.supervisorLevel ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value={1}>Level 1</option>
                  <option value={2}>Level 2</option>
                </select>
                {formErrors.supervisorLevel && (
                  <p className="mt-1 text-sm text-red-600">{formErrors.supervisorLevel}</p>
                )}
              </div>
            )}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </form>
        );

      case 'view':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <p className="mt-1 text-sm text-gray-900">{selectedUser?.name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{selectedUser?.email}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Role</label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedUser?.role.replace('_', ' ').toUpperCase()}
                {selectedUser?.supervisorLevel && ` (L${selectedUser.supervisorLevel})`}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Department</label>
              <p className="mt-1 text-sm text-gray-900">{selectedUser?.department || 'N/A'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Status</label>
              <p className="mt-1 text-sm text-gray-900">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  selectedUser?.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {selectedUser?.isActive ? 'Active' : 'Inactive'}
                </span>
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Created</label>
              <p className="mt-1 text-sm text-gray-900">
                {selectedUser?.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            <div className="flex justify-end space-x-3 pt-4">
                             <button
                 type="button"
                 onClick={() => selectedUser && openDrawer('edit', selectedUser)}
                 className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
               >
                 Edit User
               </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        );

      case 'reset-password':
        return (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">New Password *</label>
              <input
                type="password"
                required
                value={resetPasswordForm.password}
                onChange={(e) => handleInputChange('reset', 'password', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.password ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Minimum 6 characters"
              />
              {formErrors.password && (
                <p className="mt-1 text-sm text-red-600">{formErrors.password}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm New Password *</label>
              <input
                type="password"
                required
                value={resetPasswordForm.confirmPassword}
                onChange={(e) => handleInputChange('reset', 'confirmPassword', e.target.value)}
                className={`mt-1 block w-full rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${
                  formErrors.confirmPassword ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Confirm password"
              />
              {formErrors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{formErrors.confirmPassword}</p>
              )}
            </div>
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={closeDrawer}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Resetting...' : 'Reset Password'}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  console.log('Current drawer state:', { drawerOpen, drawerMode, selectedUser: selectedUser?._id });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-white">
          <div className="flex h-16 items-center justify-between px-4">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6 text-gray-400" />
            </button>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.active
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.active
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8">
            <div className="flex items-center h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="ml-4 lg:ml-0 text-2xl font-bold text-gray-900">User Management</h1>
            </div>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('Add User button clicked');
                openDrawer('create');
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </button>
          </div>
        </header>

        {/* Users Table */}
        <div className="px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white shadow overflow-hidden sm:rounded-md">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">All Users</h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage system users and their roles
              </p>
            </div>
            <div className="border-t border-gray-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Role
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user: User) => (
                      <tr 
                        key={user._id} 
                        className="hover:bg-gray-50"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.role === 'admin' ? 'bg-red-100 text-red-800' :
                            user.role === 'finance_manager' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'supervisor' ? 'bg-green-100 text-green-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role.replace('_', ' ').toUpperCase()}
                            {user.supervisorLevel && ` (L${user.supervisorLevel})`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {user.department || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('View button clicked for user:', user._id);
                                openDrawer('view', user);
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="View User"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Edit button clicked for user:', user._id);
                                openDrawer('edit', user);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Edit User"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Reset password button clicked for user:', user._id);
                                openDrawer('reset-password', user);
                              }}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Reset Password"
                            >
                              <Key className="h-4 w-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Deactivate button clicked for user:', user._id);
                                handleDeactivateUser(user._id);
                              }}
                              className="text-red-600 hover:text-red-900"
                              title="Deactivate User"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={closeDrawer}></div>
            <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex">
              <div className="w-screen max-w-md">
                <div className="h-full flex flex-col bg-white shadow-xl">
                  {/* Header */}
                  <div className="px-4 py-6 bg-gray-50 sm:px-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-medium text-gray-900">{getDrawerTitle()}</h2>
                      <button
                        onClick={closeDrawer}
                        className="rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <X className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 overflow-y-auto">
                    <div className="px-4 py-6 sm:px-6">
                      {renderDrawerContent()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
