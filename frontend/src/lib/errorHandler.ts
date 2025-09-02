import toast from 'react-hot-toast';

export interface AppError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

export class ErrorHandler {
  private static isDevelopment = process.env.NODE_ENV === 'development';

  /**
   * Handle API errors consistently
   */
  static handleApiError(error: any, context?: string): AppError {
    let appError: AppError = {
      message: 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR'
    };

    // Handle different error types
    if (error?.response?.data) {
      // API error response
      const apiError = error.response.data;
      appError = {
        message: apiError.error || apiError.message || 'API request failed',
        code: apiError.code || 'API_ERROR',
        status: error.response.status,
        details: apiError.details || apiError
      };
    } else if (error?.message) {
      // JavaScript error
      appError = {
        message: error.message,
        code: error.name || 'JS_ERROR',
        details: error
      };
    } else if (typeof error === 'string') {
      // String error
      appError = {
        message: error,
        code: 'STRING_ERROR'
      };
    }

    // Log error in development
    if (this.isDevelopment) {
      console.error(`[${context || 'ErrorHandler'}] Error:`, {
        error: appError,
        originalError: error,
        stack: error?.stack
      });
    }

    return appError;
  }

  /**
   * Show error notification to user
   */
  static showError(error: AppError | any, context?: string): void {
    const appError = this.handleApiError(error, context);
    
    // Show toast notification
    toast.error(appError.message, {
      duration: 5000,
      position: 'top-right',
    });

    // Log to console in development
    if (this.isDevelopment) {
      console.error(`[${context || 'ErrorHandler'}] User Error:`, appError);
    }
  }

  /**
   * Show success notification
   */
  static showSuccess(message: string): void {
    toast.success(message, {
      duration: 3000,
      position: 'top-right',
    });
  }

  /**
   * Show warning notification
   */
  static showWarning(message: string): void {
    toast(message, {
      duration: 4000,
      position: 'top-right',
      icon: '⚠️',
    });
  }

  /**
   * Handle form validation errors
   */
  static handleValidationError(errors: any): void {
    if (errors && typeof errors === 'object') {
      const errorMessages = Object.values(errors).flat();
      errorMessages.forEach((message: any) => {
        if (typeof message === 'string') {
          this.showError({ message, code: 'VALIDATION_ERROR' });
        }
      });
    }
  }

  /**
   * Handle network errors
   */
  static handleNetworkError(error: any): void {
    let message = 'Network error occurred';
    
    if (error?.code === 'NETWORK_ERROR') {
      message = 'Unable to connect to the server. Please check your internet connection.';
    } else if (error?.code === 'TIMEOUT_ERROR') {
      message = 'Request timed out. Please try again.';
    } else if (error?.status === 0) {
      message = 'Server is unreachable. Please try again later.';
    }

    this.showError({ message, code: 'NETWORK_ERROR' });
  }

  /**
   * Handle authentication errors
   */
  static handleAuthError(error: any): void {
    let message = 'Authentication failed';
    
    if (error?.status === 401) {
      message = 'Your session has expired. Please log in again.';
    } else if (error?.status === 403) {
      message = 'You do not have permission to perform this action.';
    }

    this.showError({ message, code: 'AUTH_ERROR' });
  }

  /**
   * Handle file upload errors
   */
  static handleFileError(error: any): void {
    let message = 'File upload failed';
    
    if (error?.code === 'FILE_TOO_LARGE') {
      message = 'File size exceeds the maximum limit.';
    } else if (error?.code === 'INVALID_FILE_TYPE') {
      message = 'File type is not supported.';
    } else if (error?.code === 'UPLOAD_FAILED') {
      message = 'Failed to upload file. Please try again.';
    }

    this.showError({ message, code: 'FILE_ERROR' });
  }

  /**
   * Log error for analytics/monitoring
   */
  static logError(error: AppError, context?: string): void {
    // In production, you would send this to your error tracking service
    if (!this.isDevelopment) {
      // Example: Sentry, LogRocket, etc.
      console.error('Production error logged:', {
        error,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
    }
  }
}

// Export convenience functions
export const showError = (error: any, context?: string) => ErrorHandler.showError(error, context);
export const showSuccess = (message: string) => ErrorHandler.showSuccess(message);
export const showWarning = (message: string) => ErrorHandler.showWarning(message);
export const handleApiError = (error: any, context?: string) => ErrorHandler.handleApiError(error, context);
