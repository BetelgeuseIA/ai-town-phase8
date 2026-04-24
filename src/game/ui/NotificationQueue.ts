// ────────────────────────────────────────────────
// NotificationQueue.ts
// Cola de notificaciones para el sistema de juego
// ────────────────────────────────────────────────

import type { NotificationType } from './NotificationSystem';

// ────────────────────────────────────────────────
// Prioridad por tipo (menor número = más prioritario)
// ────────────────────────────────────────────────
export const TYPE_PRIORITY: Record<NotificationType, number> = {
  error: 0,
  warning: 1,
  success: 2,
  info: 3,
};

// ────────────────────────────────────────────────
// Interfaz de notificación
// ────────────────────────────────────────────────
export interface QueuedNotification {
  id: string;
  message: string;
  type: NotificationType;
  duration: number;
  timestamp: number;
}

// ────────────────────────────────────────────────
// Clase Queue
// ────────────────────────────────────────────────
export class NotificationQueue {
  private queue: QueuedNotification[] = [];
  private lastMessage: string = '';
  private maxVisible: number = 3;
  private defaultDuration: number = 3000;

  /**
   * Añade una notificación a la cola
   * @param message Texto a mostrar
   * @param type Tipo: info, success, warning, error
   * @param duration Ms antes de auto-dismiss (default 3000)
   * @returns La notificación creada, o null si fue deduplicada
   */
  push(
    message: string,
    type: NotificationType = 'info',
    duration?: number
  ): QueuedNotification | null {
    // Evitar duplicados consecutivos del mismo mensaje
    if (this.lastMessage === message) {
      return null;
    }

    const notification: QueuedNotification = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      message,
      type,
      duration: duration ?? this.defaultDuration,
      timestamp: Date.now(),
    };

    this.lastMessage = message;

    // Insertar por prioridad (error > warning > success > info)
    const insertIndex = this.queue.findIndex(
      (n) => TYPE_PRIORITY[n.type] > TYPE_PRIORITY[type]
    );

    if (insertIndex === -1) {
      this.queue.push(notification);
    } else {
      this.queue.splice(insertIndex, 0, notification);
    }

    return notification;
  }

  /**
   * Elimina una notificación por id
   */
  remove(id: string): void {
    this.queue = this.queue.filter((n) => n.id !== id);
  }

  /**
   * Limpia todas las notificaciones
   */
  clear(): void {
    this.queue = [];
    this.lastMessage = '';
  }

  /**
   * Retorna las notificaciones visibles (máximo maxVisible)
   */
  getVisible(): QueuedNotification[] {
    return this.queue.slice(0, this.maxVisible);
  }

  /**
   * Retorna todas las notificaciones en cola
   */
  getAll(): QueuedNotification[] {
    return [...this.queue];
  }

  /**
   * Cantidad total en cola
   */
  get size(): number {
    return this.queue.length;
  }

  /**
   * Cantidad de notificaciones visibles
   */
  get visibleCount(): number {
    return Math.min(this.queue.length, this.maxVisible);
  }

  /**
   * Configura duración por defecto
   */
  setDefaultDuration(ms: number): void {
    this.defaultDuration = ms;
  }

  /**
   * Configura máximo de notificaciones visibles
   */
  setMaxVisible(count: number): void {
    this.maxVisible = count;
  }

  /**
   * Resetea el lastMessage (permite mostrar el mismo mensaje de nuevo
   * después de que otro fue intercalado)
   */
  allowDuplicate(): void {
    this.lastMessage = '';
  }
}

// ────────────────────────────────────────────────
// Instancia singleton para uso global
// ────────────────────────────────────────────────
export const notificationQueue = new NotificationQueue();
