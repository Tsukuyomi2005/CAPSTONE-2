import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft, Heart } from 'lucide-react';
import { useRoleStore } from '../stores/roleStore';
import { toast } from 'sonner';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

export function SignupPage() {
  const navigate = useNavigate();
  const { setRole } = useRoleStore();
  const registerOwner = useMutation(api.users.registerOwner);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): { isValid: boolean; errors: Record<string, string> } => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'Address is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, errors: newErrors };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validation = validateForm();
    if (!validation.isValid) {
      // Show specific error messages
      const errorFields = Object.keys(validation.errors);
      if (errorFields.length > 0) {
        const firstError = validation.errors[errorFields[0]];
        toast.error(firstError || 'Please fix the errors before submitting');
      } else {
        toast.error('Please fix the errors before submitting');
      }
      return;
    }

    setIsSubmitting(true);

    try {
      // Register user in Convex (use email as username)
      try {
        const normalizedEmail = formData.email.trim().toLowerCase();
        await registerOwner({
          username: normalizedEmail, // Use normalized email as username for login
          email: normalizedEmail,
          password: formData.password, // In production, hash this
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          address: formData.address,
        });
      } catch (convexError: any) {
        // If Convex registration fails, continue with localStorage only
        console.warn('Convex registration failed, using localStorage only:', convexError);
      }

      // Store user credentials locally (for demo - in production use proper auth)
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const emailKey = formData.email.trim().toLowerCase();
      storedUsers[emailKey] = {
        username: emailKey, // Normalized email is used as username
        email: emailKey,
        password: formData.password, // In production, never store plain passwords
        role: 'owner',
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
        address: formData.address,
      };
      localStorage.setItem('fursure_users', JSON.stringify(storedUsers));

      // Set role and store current user (include email for filtering)
      setRole('owner');
      localStorage.setItem('fursure_current_user', JSON.stringify({
        username: emailKey, // Normalized email is used as username
        email: emailKey, // Store email explicitly for filtering
        role: 'owner',
      }));

      toast.success('Registration successful! Welcome to Jocari Pet Clinic and Grooming Salon');
      navigate('/dashboard');
    } catch (error: any) {
      const errorMessage = error?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        {/* Left Panel - Branding */}
        <div className="md:w-1/2 bg-[#5C4033] flex items-center justify-center p-10 relative">
          <div className="absolute inset-6 border border-white/10 rounded-3xl pointer-events-none" />
          <div className="text-center text-white relative">
            <div className="mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white/15 rounded-full mb-1 backdrop-blur-md p-2">
                <img 
                  src="/jocari-logo.jpg"
                  alt="Jocari Pet Clinic and Grooming Salon Logo"
                  className="w-full h-full object-contain rounded-lg bg-white/10 p-1"
                />
              </div>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Jocari Pet Clinic and Grooming Salon</h1>
            <p className="text-sm md:text-base text-white/80">
              Create your account and start managing your pet&apos;s care.
            </p>
          </div>
        </div>

        {/* Right Panel - Signup Form */}
        <div className="md:w-1/2 bg-gray-50 flex flex-col justify-center py-8 px-6 sm:px-8 overflow-y-auto">
          <div className="w-full max-w-xl mx-auto">
            {/* Return to Home Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 mb-6 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Home</span>
            </Link>

            {/* Form Card */}
            <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
            {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Register an Account</h2>
            <p className="text-sm text-gray-600">
              Have an existing account?{' '}
              <Link to="/login" className="text-purple-600 hover:text-purple-700 font-medium">
                Login Now
              </Link>
            </p>
          </div>

          {/* Signup Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* First Name and Last Name - Two Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label htmlFor="firstName" className="sr-only">
                  First Name
                </label>
                <input
                  id="firstName"
                  name="firstName"
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleChange('firstName', e.target.value)}
                  className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="First Name"
                />
                {errors.firstName && <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>}
              </div>

              {/* Last Name */}
              <div>
                <label htmlFor="lastName" className="sr-only">
                  Last Name
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleChange('lastName', e.target.value)}
                  className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Last Name"
                />
                {errors.lastName && <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>}
              </div>
            </div>

            {/* Phone Number and Address - Two Columns */}
            <div className="grid grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label htmlFor="phone" className="sr-only">
                  Phone Number
                </label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Phone Number"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>

              {/* Address */}
              <div>
                <label htmlFor="address" className="sr-only">
                  Address
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Address"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>
            </div>

            {/* Email - Full Width */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`block w-full px-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Email Address"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password - Full Width */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleChange('password', e.target.value)}
                  className={`block w-full px-3 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password - Full Width */}
            <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleChange('confirmPassword', e.target.value)}
                  className={`block w-full px-3 py-3 pr-10 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm Password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Register Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isSubmitting ? 'Creating Account...' : 'Register'}
              </button>
            </div>
          </form>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-500">
              © 2026  Jocari Pet Clinic and Grooming Salon · Powered by FurSure. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

