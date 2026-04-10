/**
 * Shared legal copy for Terms & Conditions and Privacy Policy.
 * Used by dedicated pages and in-app modals so wording stays in sync.
 */

export function TermsContent() {
  return (
    <div className="prose prose-gray max-w-none text-sm text-gray-700 space-y-4">
      <p className="text-gray-500 text-xs">Last updated: April 10, 2026</p>
      <p>
        Welcome to FurSure, operated in connection with Jocari Pet Clinic and Grooming Salon. By creating an
        account or using our booking and pet care services, you agree to these Terms & Conditions.
      </p>
      <h3 className="text-base font-semibold text-gray-900">1. Services</h3>
      <p>
        FurSure provides scheduling, appointment management, and related tools. Veterinary services are
        delivered by licensed professionals at the clinic. FurSure does not replace professional medical
        advice outside of your visits.
      </p>
      <h3 className="text-base font-semibold text-gray-900">2. Accounts</h3>
      <p>
        You are responsible for keeping your login credentials confidential and for all activity under your
        account. You agree to provide accurate contact and pet information.
      </p>
      <h3 className="text-base font-semibold text-gray-900">3. Appointments & payments</h3>
      <p>
        Bookings are subject to availability and clinic approval. Deposits and fees follow the payment options
        presented at booking. Cancellations and rescheduling may be subject to clinic policies communicated
        at the time of service.
      </p>
      <h3 className="text-base font-semibold text-gray-900">4. Limitation of liability</h3>
      <p>
        To the extent permitted by law, FurSure and the clinic are not liable for indirect or consequential
        damages arising from use of the platform. Nothing in these terms excludes liability that cannot
        legally be excluded.
      </p>
      <h3 className="text-base font-semibold text-gray-900">5. Changes</h3>
      <p>
        We may update these terms. Material changes will be reflected on this page with an updated date.
        Continued use after changes constitutes acceptance of the revised terms.
      </p>
      <h3 className="text-base font-semibold text-gray-900">6. Contact</h3>
      <p>For questions about these terms, contact the clinic through the contact details on our website.</p>
    </div>
  );
}

export function PrivacyContent() {
  return (
    <div className="prose prose-gray max-w-none text-sm text-gray-700 space-y-4">
      <p className="text-gray-500 text-xs">Last updated: April 10, 2026</p>
      <p>
        This Privacy Policy describes how FurSure and Jocari Pet Clinic and Grooming Salon collect, use,
        and protect your information when you use our website and services.
      </p>
      <h3 className="text-base font-semibold text-gray-900">1. Information we collect</h3>
      <p>
        We may collect account details (such as name, email, phone, and address), pet and appointment
        information, and payment-related data necessary to process bookings and clinic services.
      </p>
      <h3 className="text-base font-semibold text-gray-900">2. How we use information</h3>
      <p>
        We use your information to provide scheduling, reminders, billing, clinic operations, and customer
        support. We do not sell your personal information.
      </p>
      <h3 className="text-base font-semibold text-gray-900">3. Sharing</h3>
      <p>
        We may share information with service providers that help us run the platform (for example, hosting
        or payment processing) under appropriate safeguards, and when required by law.
      </p>
      <h3 className="text-base font-semibold text-gray-900">4. Security</h3>
      <p>
        We implement reasonable technical and organizational measures to protect your data. No method of
        transmission over the internet is completely secure.
      </p>
      <h3 className="text-base font-semibold text-gray-900">5. Your choices</h3>
      <p>
        You may update certain profile information in your account settings. You may contact us to ask about
        your data or to exercise rights available under applicable law.
      </p>
      <h3 className="text-base font-semibold text-gray-900">6. Updates</h3>
      <p>
        We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change when we
        do.
      </p>
    </div>
  );
}
