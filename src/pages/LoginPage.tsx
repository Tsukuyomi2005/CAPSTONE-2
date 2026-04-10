import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Heart } from 'lucide-react';
import { useRoleStore } from '../stores/roleStore';
import { toast } from 'sonner';

export function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useRoleStore();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Basic validation
    if (!formData.email.trim()) {
      setErrors({ email: 'Email is required' });
      return;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      setErrors({ email: 'Email is invalid' });
      return;
    }
    if (!formData.password) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setIsSubmitting(true);

    try {
      // For now, we'll use a client-side approach with localStorage
      // In production, integrate with Convex Auth properly
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const emailKey = formData.email.trim().toLowerCase();
      // Prefer normalized key but fall back to raw email for older stored data
      const user = storedUsers[emailKey] || storedUsers[formData.email];

      if (user && user.password === formData.password) {
        // Set role based on user account
        setRole(user.role);
        // Store current user in session (include email for filtering)
        localStorage.setItem('fursure_current_user', JSON.stringify({
          username: user.username || user.email, // Email is used as username
          email: user.email, // Store email explicitly for filtering
          role: user.role,
          ...(user.termsAcceptedAt != null ? { termsAcceptedAt: user.termsAcceptedAt } : {}),
        }));
        toast.success('Login successful');
        navigate('/dashboard');
      } else {
        toast.error('Invalid email or password');
        setErrors({ submit: 'Invalid credentials. Please try again.' });
      }
    } catch (error) {
      toast.error('Login failed. Please try again.');
      setErrors({ submit: 'Login failed. Please try again.' });
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
                  src="https://i.imgur.com/mxgtBE2_d.png?maxwidth=520&shape=thumb&fidelity=high"
                  alt="FurSure Logo"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-1">FurSure</h1>
            <p className="text-sm md:text-base text-white/80 mb-6">
              Professional veterinary care for the pets you love most.
            </p>
            
            {/* Partner Section */}
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-xs md:text-sm text-white/70 mb-4">partnering with</p>
              <div className="flex flex-col items-center gap-3">
                <img 
                  src="/jocari-logo.jpg"
                  alt="Jocari Pet Clinic and Grooming Salon"
                  className="h-20 w-20 md:h-24 md:w-24 object-contain rounded-lg bg-white/10 p-2"
                />
                <p className="text-sm md:text-base text-white/90 font-medium text-center">
                  Jocari Pet Clinic and Grooming Salon
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="md:w-1/2 bg-white flex flex-col justify-center py-8 px-6 sm:px-8">
          <div className="w-full max-w-md mx-auto">
            {/* Return to Home Link */}
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-gray-500 hover:text-purple-600 mb-6 text-sm transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Return to Home</span>
            </Link>

            {/* Logo above Welcome Back */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-[#A47148] rounded-full blur-sm opacity-30"></div>
                <div className="relative bg-[#8B5A36] rounded-full p-3 ring-2 ring-[#A47148]/80">
                  <img 
                    src="/jocari-logo.jpg"
                    alt="Jocari Pet Clinic and Grooming Salon Logo"
                    className="h-14 w-14 object-contain rounded-lg bg-white/10 p-1"
                  />
                </div>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-gray-900">Welcome Back</h2>
              <p className="mt-2 text-sm text-gray-600">Sign in to access your dashboard</p>
            </div>

            {/* Login Form */}
            <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="sr-only">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className={`block w-full pl-10 pr-3 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Email Address"
                />
              </div>
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className={`block w-full pl-10 pr-10 py-3 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
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

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700">
                  Remember me
                </label>
              </div>
              <div className="text-sm">
                <a href="#" className="font-medium text-purple-600 hover:text-purple-500">
                  Forgot password?
                </a>
              </div>
            </div>

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            {/* Sign In Button */}
            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#5C4033] hover:bg-[#4A3328] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#A47148] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Signing in...' : 'Sign In'}
              </button>
            </div>

              {/* Register Link */}
              <div className="text-center text-sm">
                <span className="text-gray-600">Don't have an account? </span>
                <Link
                  to="/signup"
                  className="font-medium text-purple-600 hover:text-purple-500"
                >
                  Register here
                </Link>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-8 text-center text-xs text-gray-500">
              © 2026  Jocari Pet Clinic and Grooming Salon · Powered by FurSure. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

