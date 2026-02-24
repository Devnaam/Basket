import { useEffect } from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    full: 'max-w-full mx-4',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Modal panel */}
      <div
        className={`relative w-full ${sizes[size]} bg-white rounded-t-3xl sm:rounded-2xl
                    shadow-xl p-6 animate-slide-up z-10`}
      >
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
