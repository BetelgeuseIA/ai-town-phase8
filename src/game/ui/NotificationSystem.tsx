import { motion, AnimatePresence } from 'framer-motion';
import React, { useEffect, useState, useCallback } from 'react';

// ────────────────────────────────────────────────
// Tipos
// ────────────────────────────────────────────────
export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
}

interface NotificationItemProps {
  notification: Notification;
  onRemove: (id: string) => void;
}

// ────────────────────────────────────────────────
// Prioridad por tipo (menor número = más prioritario)
// ────────────────────────────────────────────────
const TYPE_PRIORITY: Record<NotificationType, number> = {
  error: 0,
  warning: 1,
  success: 2,
  info: 3,
};

// ────────────────────────────────────────────────
// Colores por tipo
// ────────────────────────────────────────────────
const TYPE_STYLES: Record<NotificationType, { bg: string; border: string; icon: string; textColor: string }> = {
  info: {
    bg: 'rgba(23, 20, 33, 0.92)',
    border: 'rgba(99, 179, 237, 0.5)',
    icon: 'ℹ️',
    textColor: '#63b3ed',
  },
  success: {
    bg: 'rgba(23, 20, 33, 0.92)',
    border: 'rgba(46, 204, 113, 0.5)',
    icon: '✅',
    textColor: '#2ecc71',
  },
  warning: {
    bg: 'rgba(23, 20, 33, 0.92)',
    border: 'rgba(221, 124, 66, 0.5)',
    icon: '⚠️',
    textColor: '#dd7c42',
  },
  error: {
    bg: 'rgba(23, 20, 33, 0.92)',
    border: 'rgba(231, 76, 60, 0.5)',
    icon: '❌',
    textColor: '#e74c3c',
  },
};

// ────────────────────────────────────────────────
// Item individual
// ────────────────────────────────────────────────
const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onRemove,
}) => {
  const styles = TYPE_STYLES[notification.type];

  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(notification.id);
    }, notification.duration);
    return () => clearTimeout(timer);
  }, [notification.id, notification.duration, onRemove]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="flex items-center gap-3 px-4 py-3 rounded-sm border backdrop-blur-sm cursor-pointer"
      style={{
        backgroundColor: styles.bg,
        borderColor: styles.border,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        minWidth: 280,
        maxWidth: 400,
      }}
      onClick={() => onRemove(notification.id)}
    >
      {/* Icono */}
      <span className="text-xl select-none flex-shrink-0">{styles.icon}</span>

      {/* Mensaje */}
      <span
        className="font-body text-sm flex-1"
        style={{ color: styles.textColor }}
      >
        {notification.message}
      </span>
    </motion.div>
  );
};

// ────────────────────────────────────────────────
// Componente principal
// ────────────────────────────────────────────────
interface NotificationSystemProps {
  notifications: Notification[];
  onRemove: (id: string) => void;
}

export const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  onRemove,
}) => {
  // Mostrar máximo 3 notificaciones
  const visible = notifications.slice(0, 3);

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 items-center">
      <AnimatePresence mode="popLayout">
        {visible.map((n) => (
          <NotificationItem
            key={n.id}
            notification={n}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// ────────────────────────────────────────────────
// AnimatePresence para animaciones de salida
// ────────────────────────────────────────────────
// const { AnimatePresence } = motion;

// ────────────────────────────────────────────────
// Hook para usar la cola
// ────────────────────────────────────────────────
export function useNotificationQueue() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const push = useCallback(
    (message: string, type: NotificationType = 'info', duration = 3000) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      setNotifications((prev) => {
        // Evitar duplicados consecutivos del mismo mensaje
        if (prev.length > 0 && prev[prev.length - 1].message === message) {
          return prev;
        }

        // Insertar por prioridad
        const newNotif: Notification = { id, message, type, duration };
        const insertIndex = prev.findIndex(
          (n) => TYPE_PRIORITY[n.type] > TYPE_PRIORITY[type]
        );

        if (insertIndex === -1) {
          return [...prev, newNotif];
        }

        const next = [...prev];
        next.splice(insertIndex, 0, newNotif);
        return next;
      });
    },
    []
  );

  const remove = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clear = useCallback(() => {
    setNotifications([]);
  }, []);

  return { notifications, push, remove, clear };
}

export default NotificationSystem;
