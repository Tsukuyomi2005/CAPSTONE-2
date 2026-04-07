import { useState, useEffect } from 'react';
import { User, Mail, Phone, Save, Lock, MapPin } from 'lucide-react';
import { toast } from 'sonner';

// Load user profile from registration data
const loadUserProfile = () => {
  try {
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (currentUserStr) {
      const currentUser = JSON.parse(currentUserStr);
      const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
      const userData = storedUsers[currentUser.username || currentUser.email];
      
      if (userData) {
        // Combine firstName and lastName into full name
        const fullName = `${userData.firstName || ''} ${userData.lastName || ''}`.trim();
        
        return {
          fullName: fullName,
          email: userData.email || '',
          phone: userData.phone || '',
          address: userData.address || '',
        };
      }
    }
  } catch (error) {
    console.error('Error loading user profile:', error);
  }
  
  // Return empty profile if no data found
  return {
    fullName: '',
    email: '',
    phone: '',
    address: '',
  };
};

export function OwnerProfileSettings() {
  const [profile, setProfile] = useState(loadUserProfile());
  const [isEditing, setIsEditing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reload profile when component mounts
  useEffect(() => {
    setProfile(loadUserProfile());
  }, []);

  const handleChange = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profile.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!profile.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(profile.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!profile.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!profile.address.trim()) {
      newErrors.address = 'Address is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) {
      toast.error('Please fix the errors before saving');
      return;
    }

    // Update user data in localStorage
    try {
      const currentUserStr = localStorage.getItem('fursure_current_user');
      if (currentUserStr) {
        const currentUser = JSON.parse(currentUserStr);
        const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
        const userKey = currentUser.username || currentUser.email;
        
        if (storedUsers[userKey]) {
          // Split full name into first and last name
          const nameParts = profile.fullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          // Update user data
          storedUsers[userKey] = {
            ...storedUsers[userKey],
            firstName,
            lastName,
            email: profile.email,
            phone: profile.phone,
            address: profile.address,
            // Keep password unchanged
          };
          localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
          
          // Also update in Convex backend (if needed)
          // await updateUserProfile({ ...profile });
        }
      }
      
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile. Please try again.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-2">Manage your profile information and preferences</p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Personal Information</h2>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 text-blue-600 hover:text-blue-700 font-medium"
              >
                Edit
              </button>
            )}
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="h-4 w-4 inline mr-2" />
              Full Name
            </label>
            {isEditing ? (
              <>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fullName ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
              </>
            ) : (
              <p className="text-gray-900">{profile.fullName || 'Not provided'}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Mail className="h-4 w-4 inline mr-2" />
              Email Address
            </label>
            {isEditing ? (
              <>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </>
            ) : (
              <p className="text-gray-900">{profile.email || 'Not provided'}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="h-4 w-4 inline mr-2" />
              Phone Number
            </label>
            {isEditing ? (
              <>
                <input
                  type="tel"
                  value={profile.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </>
            ) : (
              <p className="text-gray-900">{profile.phone || 'Not provided'}</p>
            )}
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-2" />
              Address
            </label>
            {isEditing ? (
              <>
                <textarea
                  value={profile.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.address ? 'border-red-500' : 'border-gray-300'
                  }`}
                  rows={3}
                />
                {errors.address && <p className="text-red-500 text-sm mt-1">{errors.address}</p>}
              </>
            ) : (
              <p className="text-gray-900">{profile.address || 'Not provided'}</p>
            )}
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                onClick={() => {
                  setProfile(loadUserProfile()); // Reload original data
                  setErrors({});
                  setIsEditing(false);
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Security</h2>
        </div>
        <div className="p-6">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Lock className="h-4 w-4 text-gray-600" />
            <span className="text-gray-700">Change Password</span>
          </button>
        </div>
      </div>
    </div>
  );
}

