const ONLINE_METHODS = new Set(['gcash', 'paymaya', 'online']);

export function isOnlinePaymentMethod(method?: string): boolean {
  return method ? ONLINE_METHODS.has(method) : false;
}

export function hasOnlinePayment(paymentData?: Record<string, unknown> | null): boolean {
  if (!paymentData) return false;
  return (
    isOnlinePaymentMethod(paymentData.method as string | undefined) ||
    isOnlinePaymentMethod(paymentData.depositMethod as string | undefined)
  );
}

export function generateReferenceNumber(source?: number | string): string {
  const date = source != null ? new Date(source) : new Date();
  if (Number.isNaN(date.getTime())) {
    return generateReferenceNumber();
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const suffix =
    source != null
      ? String(typeof source === 'string' ? date.getTime() : source).slice(-5).padStart(5, '0')
      : String(Date.now()).slice(-5);

  return `REF-${yyyy}${mm}${dd}${suffix}`;
}

function stableSuffixFromId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return String(hash % 100000).padStart(5, '0');
}

export function resolveReferenceNumber(
  paymentData?: Record<string, unknown> | null,
  options?: { appointmentId?: string; appointmentDate?: string },
): string | null {
  if (!paymentData || !hasOnlinePayment(paymentData)) return null;
  if (paymentData.referenceNumber) return String(paymentData.referenceNumber);

  const timestamp = paymentData.timestamp as string | undefined;
  if (timestamp) return generateReferenceNumber(timestamp);

  const transactionId = paymentData.transactionId as string | undefined;
  if (transactionId) {
    const digits = transactionId.replace(/\D/g, '');
    if (digits.length > 0) {
      return generateReferenceNumber(Number(digits.slice(-13)));
    }
  }

  if (options?.appointmentId) {
    const dateSource = options.appointmentDate
      ? new Date(`${options.appointmentDate}T12:00:00`)
      : new Date(0);
    const yyyy = dateSource.getFullYear();
    const mm = String(dateSource.getMonth() + 1).padStart(2, '0');
    const dd = String(dateSource.getDate()).padStart(2, '0');
    return `REF-${yyyy}${mm}${dd}${stableSuffixFromId(options.appointmentId)}`;
  }

  return null;
}

export function formatPaymentMethodShort(method?: string): string {
  switch (method) {
    case 'gcash':
      return 'GCash';
    case 'paymaya':
      return 'PayMaya';
    case 'online':
      return 'Online Payment';
    default:
      return method ? method.replace(/_/g, ' ') : '—';
  }
}

function formatDateAndTime(date: Date): string {
  const datePart = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${datePart} · ${timePart}`;
}

export function formatReceiptDateTime(isoOrDate?: string, time24?: string): string {
  if (isoOrDate && isoOrDate.includes('T')) {
    const date = new Date(isoOrDate);
    if (!Number.isNaN(date.getTime())) {
      return formatDateAndTime(date);
    }
  }

  if (isoOrDate && time24) {
    const date = new Date(`${isoOrDate}T${time24}`);
    if (!Number.isNaN(date.getTime())) {
      return formatDateAndTime(date);
    }
  }

  if (isoOrDate) {
    const date = new Date(`${isoOrDate}T12:00:00`);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  return '—';
}
