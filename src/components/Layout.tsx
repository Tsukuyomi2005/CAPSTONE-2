import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  X, 
  Calendar, 
  Package, 
  Heart,
  FileText,
  Clock,
  CalendarCheck,
  Receipt,
  Stethoscope,
  Users,
  User,
  BarChart3,
  CreditCard
} from 'lucide-react';
import { useRoleStore } from '../stores/roleStore';
import { cn } from '../lib/utils';

// Custom Dashboard Icon Component
const DashboardIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/1946/1946436.png"
    alt="Dashboard"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Appointments Icon Component
const AppointmentsIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/7322/7322293.png"
    alt="Appointments"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Schedule Management Icon Component
const ScheduleManagementIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/2669/2669444.png"
    alt="Schedule Management"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Services Icon Component
const ServicesIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/3440/3440611.png"
    alt="Services"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Veterinarians/Staff Icon Component
const VeterinariansStaffIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/33/33308.png"
    alt="Veterinarians/Staff"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Inventory Icon Component
const InventoryIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/7480/7480113.png"
    alt="Inventory"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Payment Icon Component
const PaymentIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/726/726559.png"
    alt="Payment"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Reports Icon Component
const ReportsIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/5956/5956361.png"
    alt="Reports"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Logout Icon Component
const LogoutIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/1828/1828479.png"
    alt="Logout"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Book Appointment Icon Component
const BookAppointmentIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/3877/3877867.png"
    alt="Book Appointment"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Payment Timeline Icon Component
const PaymentTimelineIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/8289/8289462.png"
    alt="Payment Timeline"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Pet Records Icon Component
const PetRecordsIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/18875/18875473.png"
    alt="Pet Records"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Profile Settings Icon Component
const ProfileSettingsIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/3524/3524761.png"
    alt="Profile Settings"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

// Custom Manage Availability Icon Component
const ManageAvailabilityIcon = ({ className }: { className?: string }) => (
  <img 
    src="https://cdn-icons-png.flaticon.com/128/11660/11660095.png"
    alt="Manage Availability"
    className={className}
    style={{ filter: 'brightness(0) invert(1)' }}
  />
);

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role, setRole, clearRole } = useRoleStore();

  const hasFullAccess = role === 'vet' || role === 'staff';
  const isVeterinarian = role === 'veterinarian';
  const isClinicStaff = role === 'clinicStaff';

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon, current: location.pathname === '/dashboard' },
    ...(isClinicStaff ? [
      { name: 'Manage Availability', href: '/staff-manage-availability', icon: ManageAvailabilityIcon, current: location.pathname === '/staff-manage-availability' },
      { name: 'Inventory', href: '/staff-inventory', icon: InventoryIcon, current: location.pathname === '/staff-inventory' },
      { name: 'Payment Management', href: '/staff-payment-management', icon: PaymentIcon, current: location.pathname === '/staff-payment-management' },
      { name: 'Profile Settings', href: '/staff-profile-settings', icon: ProfileSettingsIcon, current: location.pathname === '/staff-profile-settings' },
    ] : isVeterinarian ? [
      { name: 'My Appointments', href: '/vet-my-appointments', icon: AppointmentsIcon, current: location.pathname === '/vet-my-appointments' },
      { name: 'Manage Availability', href: '/vet-manage-availability', icon: ManageAvailabilityIcon, current: location.pathname === '/vet-manage-availability' },
      { name: 'Pet Records', href: '/pet-records', icon: PetRecordsIcon, current: location.pathname === '/pet-records' },
      { name: 'Appointment History', href: '/vet-appointment-history', icon: AppointmentsIcon, current: location.pathname === '/vet-appointment-history' },
      { name: 'Profile Settings', href: '/vet-profile-settings', icon: ProfileSettingsIcon, current: location.pathname === '/vet-profile-settings' },
    ] : hasFullAccess ? [
      { name: 'Appointments', href: '/appointments', icon: AppointmentsIcon, current: location.pathname === '/appointments' },
      { name: 'Schedule Management', href: '/schedule-management', icon: ScheduleManagementIcon, current: location.pathname === '/schedule-management' },
      { name: 'Services', href: '/services', icon: ServicesIcon, current: location.pathname === '/services' },
      { name: 'Veterinarians/Staff', href: '/staff-management', icon: VeterinariansStaffIcon, current: location.pathname === '/staff-management' },
      { name: 'Inventory', href: '/inventory', icon: InventoryIcon, current: location.pathname === '/inventory' },
      { name: 'Payment Transactions', href: '/payment-transactions', icon: PaymentIcon, current: location.pathname === '/payment-transactions' },
      { name: 'Reports', href: '/reports', icon: ReportsIcon, current: location.pathname === '/reports' },
    ] : [
      { name: hasFullAccess ? 'Appointments' : 'Book Appointment', href: '/appointments', icon: BookAppointmentIcon, current: location.pathname === '/appointments' },
      { name: 'My Appointments', href: '/my-appointments', icon: AppointmentsIcon, current: location.pathname === '/my-appointments' },
      { name: 'Payment Timeline', href: '/payment-timeline', icon: PaymentTimelineIcon, current: location.pathname === '/payment-timeline' },
      { name: 'Pet Records', href: '/pet-records', icon: PetRecordsIcon, current: location.pathname === '/pet-records' },
      { name: 'Profile Settings', href: '/owner-profile-settings', icon: ProfileSettingsIcon, current: location.pathname === '/owner-profile-settings' },
    ]),
  ];

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'vet': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'veterinarian': return 'bg-indigo-100 text-indigo-800';
      case 'clinicStaff': return 'bg-teal-100 text-teal-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleLogout = () => {
    // Clear stored user session
    localStorage.removeItem('fursure_current_user');
    // Clear role from store
    clearRole();
    // Navigate to login page
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={cn(
        "fixed inset-0 z-50 lg:hidden",
        sidebarOpen ? "block" : "hidden"
      )}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-64 flex-col bg-[#5C4033] shadow-xl font-sinkin">
          <div className="flex h-auto min-h-16 items-center justify-center px-4 py-3 border-b border-purple-500/30 relative">
            <div className="flex flex-col items-center gap-1.5">
              <img 
                src="/jocari-logo.jpg"
                alt="Jocari Pet Clinic and Grooming Salon Logo"
                className="h-14 w-14 object-contain rounded-lg bg-white/10 p-1"
              />
              <span className="text-sm font-semibold text-white text-center leading-tight">
                Jocari Pet Clinic
                <br />
                and Grooming Salon
              </span>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute right-4 text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="flex-1 px-4 py-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
                  item.current
                    ? "bg-white/20 text-white border-l-4 border-white/50"
                    : "text-white hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-purple-500/30">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 w-full transition-colors"
            >
              <LogoutIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:bg-[#5C4033] lg:border-r lg:border-purple-500/30">
        <div className="flex h-auto min-h-16 items-center justify-center px-4 py-3 border-b border-purple-500/30">
          <div className="flex flex-col items-center gap-1.5">
            <img 
              src="/jocari-logo.jpg"
              alt="Jocari Pet Clinic and Grooming Salon Logo"
              className="h-12 w-12 object-contain rounded-lg bg-white/10 p-1"
            />
            <span className="text-sm font-semibold text-white text-center leading-tight">
              Jocari Pet Clinic
              <br />
              and Grooming Salon
            </span>
          </div>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative",
                item.current
                  ? "bg-white/20 text-white border-l-4 border-white/50"
                  : "text-white hover:bg-white/10 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-purple-500/30">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white hover:bg-white/10 w-full transition-colors"
            >
              <LogoutIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b px-4 lg:px-6 h-16 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex items-center gap-4">
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-medium capitalize",
              getRoleBadgeColor()
            )}>
              {role === 'vet' ? 'Admin' : role === 'staff' ? 'Staff Member' : role === 'veterinarian' ? 'Veterinarian' : role === 'clinicStaff' ? 'Clinic Staff' : role === 'owner' ? 'Pet Owner' : 'Guest'}
            </span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
