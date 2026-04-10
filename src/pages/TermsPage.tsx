import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { TermsContent } from '../content/legalDocuments';
import { useRoleStore } from '../stores/roleStore';

export function TermsPage() {
  const navigate = useNavigate();
  const { role } = useRoleStore();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(role ? '/dashboard' : '/');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 text-gray-600 hover:text-purple-600 text-sm mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="bg-white rounded-xl shadow-sm border p-6 sm:p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Terms & Conditions</h1>
          <TermsContent />
          <p className="mt-8 text-sm text-gray-500">
            A printable copy is available on this page. You can also open{' '}
            <Link to="/privacy" className="text-purple-600 hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
