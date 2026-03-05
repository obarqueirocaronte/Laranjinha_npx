import React from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Info, XCircle, AlertCircle, X } from 'lucide-react';
import clsx from 'clsx';

export type NotificationType = 'success' | 'info' | 'error' | 'warning';

interface NotificationProps {
    id: string;
    type: NotificationType;
    message: string;
    onClose: (id: string) => void;
}

const icons = {
    success: <CheckCircle className="text-emerald-500" size={20} />,
    info: <Info className="text-blue-500" size={20} />,
    error: <XCircle className="text-red-500" size={20} />,
    warning: <AlertCircle className="text-amber-500" size={20} />,
};

export const NotificationToast: React.FC<NotificationProps> = ({ id, type, message, onClose }) => {
    React.useEffect(() => {
        const timer = setTimeout(() => onClose(id), 5000);
        return () => clearTimeout(timer);
    }, [id, onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            className={clsx(
                "flex items-center gap-3 p-4 rounded-2xl border backdrop-blur-xl shadow-lg min-w-[300px]",
                type === 'success' && "bg-emerald-50/80 border-emerald-200/50",
                type === 'info' && "bg-blue-50/80 border-blue-200/50",
                type === 'error' && "bg-red-50/80 border-red-200/50",
                type === 'warning' && "bg-amber-50/80 border-amber-200/50"
            )}
        >
            <div className="flex-shrink-0">{icons[type]}</div>
            <div className="flex-1">
                <p className="text-sm font-bold text-slate-800">{message}</p>
            </div>
            <button
                onClick={() => onClose(id)}
                className="p-1 hover:bg-black/5 rounded-lg transition-colors"
            >
                <X size={16} className="text-slate-600" />
            </button>
        </motion.div>
    );
};
