
import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    warning: 'bg-amber-500',
  }[type];

  const icon = {
    success: 'fa-circle-check',
    error: 'fa-circle-exclamation',
    warning: 'fa-triangle-exclamation',
  }[type];

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center p-4 rounded-lg shadow-xl text-white ${bgColor} transition-all duration-300 transform animate-bounce-short`}>
      <i className={`fas ${icon} mr-3 text-xl`}></i>
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className="ml-4 text-white/80 hover:text-white">
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Toast;
