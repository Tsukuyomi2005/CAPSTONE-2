import { create } from 'zustand';

const VALID_ROLES = ['vet', 'staff', 'owner', 'veterinarian', 'clinicStaff'] as const;
type Role = (typeof VALID_ROLES)[number];

interface RoleState {
  role: Role | null;
  setRole: (role: Role | null) => void;
  clearRole: () => void;
}

/** Hydrate role from localStorage synchronously so first render after reload has correct role. */
function getInitialRole(): Role | null {
  if (typeof window === 'undefined') return null;
  try {
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (!currentUserStr) return null;
    const currentUser = JSON.parse(currentUserStr);
    if (currentUser?.role && VALID_ROLES.includes(currentUser.role)) {
      return currentUser.role;
    }
  } catch {
    // ignore invalid JSON or missing data
  }
  return null;
}

export const useRoleStore = create<RoleState>((set) => ({
  role: getInitialRole(),
  setRole: (role) => set({ role }),
  clearRole: () => set({ role: null }),
}));
