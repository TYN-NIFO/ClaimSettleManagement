'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/lib/store';
import { setError, clearError } from '@/lib/slices/authSlice';
import { useCheckUsernameMutation } from '@/lib/api';
import authService from '@/lib/authService';

const LoginPage = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [checkUsername, { isLoading: isCheckingUsername }] = useCheckUsernameMutation();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect to appropriate dashboard based on user role
      switch (user.role) {
        case 'employee':
          router.push('/employee');
          break;
        case 'supervisor':
          router.push('/supervisor');
          break;
        case 'finance_manager':
          router.push('/finance');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/employee');
      }
    }
  }, [isAuthenticated, user, router]);

  // Clear errors when form data changes
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      setErrors({});
      dispatch(clearError());
    }
  }, [formData, dispatch, errors]);

  // Check email availability
  const handleEmailBlur = async () => {
    if (formData.email && formData.email.includes('@')) {
      setIsCheckingEmail(true);
      try {
        console.log('Checking email availability for:', formData.email);
        const result = await checkUsername({ email: formData.email }).unwrap();
        console.log('Email check result:', result);
        
        if (!result.available) {
          setErrors(prev => ({ ...prev, email: 'This email is not registered' }));
        } else {
          // Clear email error if email is available
          setErrors(prev => {
            const newErrors = { ...prev };
            delete newErrors.email;
            return newErrors;
          });
        }
      } catch (error: any) {
        console.error('Email check error:', error);
        // Don't show error to user for email check failures
        // Just log it for debugging
      } finally {
        setIsCheckingEmail(false);
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
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
      setIsAuthenticating(true);
      dispatch(clearError());
      
      const result = await authService.authenticate(formData);

      // Setup auto-refresh for the new token
      authService.setupAutoRefresh();

      // Redirect based on user role
      switch (result.user.role) {
        case 'employee':
          router.push('/employee');
          break;
        case 'supervisor':
          router.push('/supervisor');
          break;
        case 'finance_manager':
          router.push('/finance');
          break;
        case 'admin':
          router.push('/admin');
          break;
        default:
          router.push('/employee');
      }
    } catch (error: any) {
      console.error('Token authentication error:', error);
      
      if (error.message.includes('Invalid credentials')) {
        setErrors({ 
          email: 'Invalid credentials',
          password: 'Invalid credentials'
        });
      } else {
        setErrors({ general: error.message || 'Authentication failed. Please try again.' });
      }
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Enter your credentials to access the claim management system
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email" className="sr-only">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Email address"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleEmailBlur}
                disabled={isAuthenticating}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email}</p>
              )}
              {isCheckingEmail && (
                <p className="mt-1 text-sm text-blue-600">Checking email...</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className={`appearance-none rounded-none relative block w-full px-3 py-2 border ${
                  errors.password ? 'border-red-300' : 'border-gray-300'
                } placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm`}
                placeholder="Password"
                value={formData.password}
                onChange={handleInputChange}
                disabled={isAuthenticating}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.general && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    {errors.general}
                  </h3>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={isAuthenticating || isCheckingUsername}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Forgot your password?
              </a>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                Need help?
              </a>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
