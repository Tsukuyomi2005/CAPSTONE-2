// @ts-nocheck - Type definitions will be available after npm install
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'sonner';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Reports } from './pages/Reports';
import { Appointments } from './pages/Appointments';
import { PetRecords } from './pages/PetRecords';
import { LandingPage } from './pages/LandingPage';
import { ScheduleManagement } from './pages/ScheduleManagement';
import { MyAppointments } from './pages/MyAppointments';
import { PaymentTimeline } from './pages/PaymentTimeline';
import { Services } from './pages/Services';
import { StaffManagement } from './pages/StaffManagement';
import { VetDashboard } from './pages/VetDashboard';
import { VetMyAppointments } from './pages/VetMyAppointments';
import { VetManageAvailability } from './pages/VetManageAvailability';
import { VetAppointmentHistory } from './pages/VetAppointmentHistory';
import { VetProfileSettings } from './pages/VetProfileSettings';
import { StaffDashboard } from './pages/StaffDashboard';
import { StaffManageAvailability } from './pages/StaffManageAvailability';
import { StaffProfileSettings } from './pages/StaffProfileSettings';
import { StaffInventory } from './pages/StaffInventory';
import { StaffPaymentManagement } from './pages/StaffPaymentManagement';
import { PaymentTransactions } from './pages/PaymentTransactions';
import { OwnerProfileSettings } from './pages/OwnerProfileSettings';
import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { useRoleStore } from './stores/roleStore';
import { useEffect } from 'react';
import { initializeAdminAccount } from './utils/initializeAdmin';

function AppRoutes() {
  const { role, setRole } = useRoleStore();
  const location = useLocation();

  useEffect(() => {
    // Initialize admin account on app load
    initializeAdminAccount();
    
    // Load user role from localStorage if available (from login)
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (currentUserStr) {
      try {
        const currentUser = JSON.parse(currentUserStr);
        if (currentUser.role && ['vet', 'staff', 'owner', 'veterinarian', 'clinicStaff'].includes(currentUser.role)) {
          setRole(currentUser.role);
          return;
        }
      } catch (e) {
        // Invalid stored user, clear it
        localStorage.removeItem('fursure_current_user');
      }
    }

    // Fallback to URL params for backward compatibility (demo mode)
    const urlParams = new URLSearchParams(window.location.search);
    const roleParam = urlParams.get('role') as 'vet' | 'staff' | 'owner' | 'veterinarian' | 'clinicStaff' | null;
    if (roleParam && ['vet', 'staff', 'owner', 'veterinarian', 'clinicStaff'].includes(roleParam)) {
      setRole(roleParam);
    }
  }, [setRole]);

  const hasFullAccess = role === 'vet' || role === 'staff';
  const isVeterinarian = role === 'veterinarian';
  const isClinicStaff = role === 'clinicStaff';

  // Show landing page, login, or signup if on those routes (always accessible)
  // Also show if no role is selected
  if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/signup' || !role) {
    return (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={
          isVeterinarian ? <VetDashboard /> : 
          isClinicStaff ? <StaffDashboard /> : 
          <Dashboard />} />
        {isClinicStaff ? (
          <>
            <Route path="/staff-manage-availability" element={<StaffManageAvailability />} />
            <Route path="/staff-inventory" element={<StaffInventory />} />
            <Route path="/staff-payment-management" element={<StaffPaymentManagement />} />
            <Route path="/staff-profile-settings" element={<StaffProfileSettings />} />
          </>
        ) : isVeterinarian ? (
          <>
            <Route path="/vet-my-appointments" element={<VetMyAppointments />} />
            <Route path="/vet-manage-availability" element={<VetManageAvailability />} />
            <Route path="/pet-records" element={<PetRecords />} />
            <Route path="/vet-appointment-history" element={<VetAppointmentHistory />} />
            <Route path="/vet-profile-settings" element={<VetProfileSettings />} />
          </>
        ) : hasFullAccess ? (
          <>
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/schedule-management" element={<ScheduleManagement />} />
            <Route path="/services" element={<Services />} />
            <Route path="/staff-management" element={<StaffManagement />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/payment-transactions" element={<PaymentTransactions />} />
            <Route path="/reports" element={<Reports />} />
          </>
        ) : (
          <>
            <Route path="/appointments" element={<Appointments />} />
            <Route path="/my-appointments" element={<MyAppointments />} />
            <Route path="/payment-timeline" element={<PaymentTimeline />} />
            <Route path="/pet-records" element={<PetRecords />} />
            <Route path="/owner-profile-settings" element={<OwnerProfileSettings />} />
          </>
        )}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <AppRoutes />
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}
