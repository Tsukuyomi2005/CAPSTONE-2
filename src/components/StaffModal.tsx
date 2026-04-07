import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { X, Lock, Eye, EyeOff } from 'lucide-react';
import { useStaffStore } from '../stores/staffStore';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { toast } from 'sonner';
import type { Staff } from '../types';

interface StaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff?: Staff | null;
}

export function StaffModal({ isOpen, onClose, staff }: StaffModalProps) {
  const { addStaff, updateStaff } = useStaffStore();
  const createStaffAccount = useMutation(api.users.createStaffAccount);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    position: 'Veterinarian' as 'Veterinarian' | 'Vet Staff',
    licenseNumber: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (staff) {
      // Split name into first and last name
      const nameParts = staff.name.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      setFormData({
        firstName,
        lastName,
        position: staff.position,
        licenseNumber: staff.licenseNumber || '', // Load license number from staff record
        phone: staff.phone,
        email: staff.email,
        password: '', // Password not shown when editing
        confirmPassword: '',
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        position: 'Veterinarian',
        licenseNumber: '',
        phone: '',
        email: '',
        password: '',
        confirmPassword: '',
      });
    }
    setErrors({});
    setShowPassword(false);
  }, [staff, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }
    // License number required only for Veterinarian
    if (formData.position === 'Veterinarian' && !formData.licenseNumber.trim()) {
      newErrors.licenseNumber = 'License number is required for veterinarians';
    }
    // Email is always required
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    // Only require password when creating new staff (not editing)
    if (!staff) {
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
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      if (staff) {
        // Update existing staff (combine first and last name)
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        const staffData: any = {
          name: fullName,
          position: formData.position,
          email: formData.email,
          phone: formData.phone,
        };
        
        // Include license number if position is Veterinarian
        if (formData.position === 'Veterinarian') {
          staffData.licenseNumber = formData.licenseNumber;
        } else {
          // Clear license number if changing from Veterinarian to Clinic Staff
          staffData.licenseNumber = undefined;
        }
        
        await updateStaff(staff.id, staffData);
        
        // Also update in localStorage
        try {
          const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
          const userKey = formData.email;
          if (storedUsers[userKey]) {
            storedUsers[userKey] = {
              ...storedUsers[userKey],
              firstName: formData.firstName,
              lastName: formData.lastName,
              email: formData.email,
              phone: formData.phone,
              position: formData.position,
              licenseNumber: formData.position === 'Veterinarian' ? formData.licenseNumber : undefined,
            };
            localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
          }
        } catch (error) {
          console.error('Error updating localStorage:', error);
        }
        
        toast.success('Staff member updated successfully');
      } else {
        // Create new staff member first (combine first and last name)
        const fullName = `${formData.firstName} ${formData.lastName}`.trim();
        const staffData: any = {
          name: fullName,
          position: formData.position,
          email: formData.email,
          phone: formData.phone,
          status: 'active', // Default status for backend compatibility
        };
        
        // Include license number if position is Veterinarian
        if (formData.position === 'Veterinarian') {
          staffData.licenseNumber = formData.licenseNumber;
        }
        
        const newStaff = await addStaff(staffData);
        
        // Create user account for the staff member
        try {
          const accountResult = await createStaffAccount({
            username: formData.email, // Use email as username
            email: formData.email,
            password: formData.password, // In production, hash this
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            position: formData.position,
            licenseNumber: formData.licenseNumber,
            staffId: newStaff.id as any, // Link to staff record
          });

          // Store user credentials locally (for demo - in production use proper auth)
          const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
          const userData: any = {
            username: formData.email, // Email is used as username
            email: formData.email,
            password: formData.password, // In production, never store plain passwords
            role: accountResult.role,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone,
            position: formData.position,
          };
          
          // Always store licenseNumber for veterinarians (required field)
          // Since licenseNumber is required for Veterinarian position, it should always be present
          if (formData.position === 'Veterinarian') {
            userData.licenseNumber = formData.licenseNumber;
          }
          
          storedUsers[formData.email] = userData;
          localStorage.setItem('fursure_users', JSON.stringify(storedUsers));

          toast.success(`Staff member and account created successfully. Role: ${accountResult.role}`);
        } catch (accountError: any) {
          // If account creation fails, we still have the staff record
          console.error('Failed to create account:', accountError);
          toast.warning('Staff member created, but account creation failed: ' + (accountError?.message || 'Unknown error'));
        }
      }
      onClose();
    } catch (error: any) {
      console.error('Failed to save staff:', error);
      const errorMessage = error?.message || 'Failed to save staff member. Please try again.';
      setErrors({ submit: errorMessage });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              {staff ? 'Edit Staff Member' : 'Add New Staff Member'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-3">
            {/* First Name and Last Name - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, firstName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.firstName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter first name"
                />
                {errors.firstName && <p className="text-red-500 text-sm mt-1">{errors.firstName}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, lastName: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.lastName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter last name"
                />
                {errors.lastName && <p className="text-red-500 text-sm mt-1">{errors.lastName}</p>}
              </div>
            </div>

            {/* Position and Phone - Side by Side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Position *
                </label>
                <select
                  value={formData.position}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({ ...formData, position: e.target.value as 'Veterinarian' | 'Vet Staff', licenseNumber: '' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Veterinarian">Veterinarian</option>
                  <option value="Vet Staff">Clinic Staff</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">Veterinarians can manage appointments. Clinic Staff can manage inventory.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, phone: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter phone number"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>
            </div>

            {/* License Number - Centered, only shown for Veterinarian */}
            {formData.position === 'Veterinarian' && (
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    License Number *
                  </label>
                  <input
                    type="text"
                    value={formData.licenseNumber}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, licenseNumber: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.licenseNumber ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter license number"
                  />
                  {errors.licenseNumber && <p className="text-red-500 text-sm mt-1">{errors.licenseNumber}</p>}
                </div>
              </div>
            )}

            {/* Email - Show in main form when editing */}
            {staff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter email address"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>
            )}

            {/* Account Credentials - Only shown when creating new staff */}
            {!staff && (
              <>
                <div className="border-t pt-4 mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Account Credentials</h4>
                  
                  {/* Email */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                        errors.email ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter email address"
                    />
                    {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                  </div>

                  {/* Password and Confirm Password - Side by Side */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, password: e.target.value })}
                          className={`block w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter password"
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
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                      <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Lock className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.confirmPassword}
                          onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className={`block w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                            errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Confirm password"
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
                      {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>
              </>
            )}

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Saving...' : (staff ? 'Update' : 'Add') + ' Staff'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

