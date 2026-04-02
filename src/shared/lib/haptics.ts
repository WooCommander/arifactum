import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'
import { Capacitor } from '@capacitor/core'

/**
 * Обертка над Capacitor Haptics для безопасного вызова в вебе и на нативных устройствах.
 * Веб-браузеры игнорируют эти вызовы без выброса ошибок (кроме Safari, который иногда требует обработки).
 */
export const FpHaptics = {
  /**
   * Легкий отклик. Используется для микро-взаимодействий
   * (например, переключение табов, выбор пункта меню).
   */
  light: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Light })
    } catch (e) {
      // Игнорируем ошибки неподдерживаемых платформ
    }
  },

  /**
   * Средний отклик. Используется для значимых действий
   * (например, добавление в список покупок, сброс фильтров).
   */
  medium: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (e) {}
  },

  /**
   * Тяжелый отклик. Используется для деструктивных или важных действий
   * (например, удаление элемента, отмена).
   */
  heavy: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (e) {}
  },

  /**
   * Успешное действие (например, сохранение цены).
   */
  success: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Success })
    } catch (e) {}
  },

  /**
   * Предупреждение (например, подтверждение удаления).
   */
  warning: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Warning })
    } catch (e) {}
  },

  /**
   * Ошибка загрузки или сохранения.
   */
  error: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.notification({ type: NotificationType.Error })
    } catch (e) {}
  },

  /**
   * Особый сигнал изменения (например, долгое удержание или изменение значения ползунком).
   */
  selection: async () => {
    if (!Capacitor.isNativePlatform()) return
    try {
      await Haptics.selectionStart()
      await Haptics.selectionChanged()
      await Haptics.selectionEnd()
    } catch (e) {}
  }
}
