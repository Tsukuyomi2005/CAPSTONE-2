/**
 * Script to create the initial admin account
 * Run this once to set up the admin account
 * 
 * Usage: node scripts/createAdminAccount.mjs
 */

// Admin account credentials
const ADMIN_CREDENTIALS = {
  email: 'admin_test',
  password: 'test123',
  firstName: 'Admin',
  lastName: 'User',
  phone: '',
  address: '',
};

// Create admin account in localStorage (for demo)
function createAdminInLocalStorage() {
  try {
    const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
    
    // Check if admin already exists
    if (storedUsers[ADMIN_CREDENTIALS.email]) {
      console.log('Admin account already exists in localStorage');
      return;
    }

    // Create admin account
    storedUsers[ADMIN_CREDENTIALS.email] = {
      username: ADMIN_CREDENTIALS.email,
      email: ADMIN_CREDENTIALS.email,
      password: ADMIN_CREDENTIALS.password,
      role: 'vet', // 'vet' is the admin role
      firstName: ADMIN_CREDENTIALS.firstName,
      lastName: ADMIN_CREDENTIALS.lastName,
      phone: ADMIN_CREDENTIALS.phone,
      address: ADMIN_CREDENTIALS.address,
    };

    localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
    console.log('✅ Admin account created successfully!');
    console.log('Email:', ADMIN_CREDENTIALS.email);
    console.log('Password:', ADMIN_CREDENTIALS.password);
    console.log('Role: Admin (vet)');
  } catch (error) {
    console.error('Error creating admin account:', error);
  }
}

// Note: This script needs to be run in the browser console
// since localStorage is only available in the browser
console.log(`
To create the admin account, run this in your browser console:

const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
storedUsers['admin_test'] = {
  username: 'admin_test',
  email: 'admin_test',
  password: 'test123',
  role: 'vet',
  firstName: 'Admin',
  lastName: 'User',
  phone: '',
  address: '',
};
localStorage.setItem('fursure_users', JSON.stringify(storedUsers));
console.log('Admin account created!');
`);

