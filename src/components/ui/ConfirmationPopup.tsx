import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, Check } from 'lucide-react';

interface ConfirmationPopupProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'warning' | 'info' | 'danger';
}

export function ConfirmationPopup({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  type = 'warning'
}: ConfirmationPopupProps) {
  const getColors = () => {
    switch (type) {
      case 'danger':
        return {
          icon: 'text-red-400',
          gradient: 'from-red-500/20 to-pink-500/20',
          border: 'border-red-500/30',
          confirmBg: 'from-red-600 to-red-500',
          confirmHover: 'hover:from-red-700 hover:to-red-600'
        };
      case 'info':
        return {
          icon: 'text-blue-400',
          gradient: 'from-blue-500/20 to-cyan-500/20',
          border: 'border-blue-500/30',
          confirmBg: 'from-blue-600 to-blue-500',
          confirmHover: 'hover:from-blue-700 hover:to-blue-600'
        };
      default: // warning
        return {
          icon: 'text-yellow-400',
          gradient: 'from-yellow-500/20 to-orange-500/20',
          border: 'border-yellow-500/30',
          confirmBg: 'from-yellow-600 to-orange-500',
          confirmHover: 'hover:from-yellow-700 hover:to-orange-600'
        };
    }
  };

  const colors = getColors();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className={`bg-gradient-to-br ${colors.gradient} backdrop-blur-xl border ${colors.border} rounded-2xl p-6 w-full max-w-md shadow-2xl`}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-4">
              <div className={`p-3 rounded-full bg-black/20 ${colors.icon}`}>
                <AlertTriangle size={24} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white">{title}</h3>
              </div>
              <button
                onClick={onCancel}
                className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Message */}
            <p className="text-gray-300 mb-6 leading-relaxed">
              {message}
            </p>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-3 bg-gray-600/30 hover:bg-gray-600/50 rounded-xl font-medium text-white transition-all duration-200 border border-gray-500/30"
              >
                {cancelText}
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className={`flex-1 px-4 py-3 bg-gradient-to-r ${colors.confirmBg} ${colors.confirmHover} rounded-xl font-medium text-white transition-all duration-200 shadow-lg flex items-center justify-center gap-2`}
              >
                <Check size={18} />
                {confirmText}
              </motion.button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
