/**
 * Initialize admin account in localStorage
 * This ensures the admin account exists when the app loads
 */

export function initializeAdminAccount() {
  try {
    const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
    
    // Admin account credentials
    const adminEmail = 'admin_test@gmail.com';
    const adminPassword = 'AdminTest';

    // Check if admin already exists
    if (storedUsers[adminEmail]) {
      storedUsers[adminEmail].role = 'vet';
      storedUsers[adminEmail].password = adminPassword;
      localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
      return;
    }

    // Create admin account
    storedUsers[adminEmail] = {
      username: adminEmail,
      email: adminEmail,
      password: adminPassword,
      role: 'vet', // 'vet' is the admin role
      firstName: 'Admin',
      lastName: 'User',
      phone: '',
      address: '',
    };

    localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
    console.log('✅ Admin account initialized');
  } catch (error) {
    console.error('Error initializing admin account:', error);
  }
}

