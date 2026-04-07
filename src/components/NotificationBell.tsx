import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { useRoleStore } from '../stores/roleStore';
import { cn } from '../lib/utils';

const NOTIFICATION_LABELS: Record<string, string> = {
  appointment_confirmed: 'Appointment confirmed',
  appointment_rejected: 'Appointment rejected',
  appointment_rescheduled_by_admin: 'Appointment rescheduled (by admin)',
  new_appointment_request: 'New appointment request',
  owner_reschedule_request: 'Owner rescheduled request',
  owner_cancellation: 'Cancellation by owner',
};

function getCurrentUserEmail(): string | undefined {
  try {
    const currentUserStr = localStorage.getItem('fursure_current_user');
    if (!currentUserStr) return undefined;
    const currentUser = JSON.parse(currentUserStr);
    const storedUsers = JSON.parse(localStorage.getItem('fursure_users') || '{}');
    const userData = storedUsers[currentUser.username || currentUser.email];
    return userData?.email || currentUser.email || currentUser.username;
  } catch {
    return undefined;
  }
}

function formatRelativeTime(createdMs: number): string {
  const sec = Math.floor((Date.now() - createdMs) / 1000);
  if (sec < 45) return 'Just now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(createdMs).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationBell() {
  const { role } = useRoleStore();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentUserEmail = getCurrentUserEmail();

  const listEnabled =
    (role === 'owner' && !!currentUserEmail) ||
    role === 'vet' ||
    role === 'staff';

  const notifications = useQuery(
    api.notifications.list,
    listEnabled
      ? { userRole: role ?? undefined, userEmail: currentUserEmail }
      : 'skip',
  );

  const markRead = useMutation(api.notifications.markRead);
  const markAllRead = useMutation(api.notifications.markAllRead);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || buttonRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  if (!listEnabled) {
    return null;
  }

  const items = notifications ?? [];
  const unreadCount = items.filter((n) => !n.read).length;

  const handleOpenNav = (
    id: Id<'clinicNotifications'>,
    read: boolean,
    appointmentId?: string,
  ) => {
    setOpen(false);
    const q = appointmentId
      ? `?appointment=${encodeURIComponent(appointmentId)}`
      : '';
    if (role === 'owner') {
      navigate(`/my-appointments${q}`);
    } else {
      navigate(`/schedule-management${q}`);
    }
    // After navigation so deep-link modal isn’t fighting Convex/markRead re-renders
    if (!read && role) {
      void markRead({
        id,
        userRole: role,
        userEmail: currentUserEmail,
      });
    }
  };

  const handleMarkAllRead = async () => {
    if (!role || unreadCount === 0) return;
    try {
      await markAllRead({ userRole: role, userEmail: currentUserEmail });
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors',
          'border-[#5C4033]/20 bg-[#faf8f6] text-[#5C4033] hover:bg-[#5C4033]/10 hover:border-[#5C4033]/35',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7c5a48]/40',
        )}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" strokeWidth={2} />
        {unreadCount > 0 ? (
          <span
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#6b4e3d] px-1 text-[10px] font-semibold text-white shadow-sm"
            aria-hidden
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panelRef}
          className={cn(
            'absolute right-0 z-[100] mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-xl border shadow-xl',
            'border-[#5C4033]/20 bg-white ring-1 ring-black/5',
          )}
        >
          <div className="flex items-center justify-between border-b border-[#5C4033]/10 bg-[#faf8f6] px-4 py-3">
            <span className="text-sm font-semibold text-[#3d2b22]">Notifications</span>
            {unreadCount > 0 ? (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs font-medium text-[#6b4e3d] hover:text-[#5C4033] hover:underline"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,20rem)] overflow-y-auto">
            {notifications === undefined ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">Loading…</div>
            ) : items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                You&apos;re all caught up.
              </div>
            ) : (
              <ul className="divide-y divide-[#5C4033]/8">
                {items.map((n) => {
                  const label =
                    NOTIFICATION_LABELS[n.kind] ?? n.kind.replace(/_/g, ' ');
                  return (
                    <li key={n._id}>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenNav(n._id, n.read, n.appointmentId ?? undefined)
                        }
                        className={cn(
                          'flex w-full flex-col gap-1 px-4 py-3 text-left transition-colors',
                          n.read
                            ? 'bg-white hover:bg-gray-50/80'
                            : 'bg-[#f3edea] hover:bg-[#ebe3dd]',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={cn(
                              'text-sm leading-snug',
                              n.read ? 'text-gray-700' : 'font-medium text-[#3d2b22]',
                            )}
                          >
                            {label}
                          </span>
                          <span
                            className={cn(
                              'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              n.read
                                ? 'bg-gray-100 text-gray-500'
                                : 'bg-[#6b4e3d] text-white',
                            )}
                          >
                            {n.read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {formatRelativeTime(n._creationTime)}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
