import { X } from 'lucide-react';
import { TermsContent, PrivacyContent } from '../content/legalDocuments';

type LegalDoc = 'terms' | 'privacy';

interface LegalDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LegalDoc | null;
}

const titles: Record<LegalDoc, string> = {
  terms: 'Terms & Conditions',
  privacy: 'Privacy Policy',
};

export function LegalDocumentModal({ isOpen, onClose, document }: LegalDocumentModalProps) {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-doc-title"
        className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
      >
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 shrink-0">
          <h2 id="legal-doc-title" className="text-lg font-semibold text-gray-900">
            {titles[document]}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">
          {document === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
        <div className="px-5 py-3 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
