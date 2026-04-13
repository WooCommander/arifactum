<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import MainLayout from '@/layouts/MainLayout.vue'
import FpNotificationContainer from '@/design-system/components/FpNotificationContainer.vue'
import { DeviceService } from '@/app/services/DeviceService'
import { UpdateService, type UpdateInfo } from '@/app/services/UpdateService'
import { Download } from 'lucide-vue-next'

const { initTheme } = useTheme()
const availableUpdate = ref<UpdateInfo | null>(null)

const dismissUpdate = () => {
  availableUpdate.value = null
}

const installUpdate = () => {
  if (availableUpdate.value?.apkUrl) {
    window.open(availableUpdate.value.apkUrl, '_blank')
    availableUpdate.value = null
  }
}

onMounted(async () => {
  initTheme()
  DeviceService.initStatusBar()
  
  // Check for updates after a short delay
  setTimeout(async () => {
    const update = await UpdateService.checkForUpdates()
    if (update) {
      availableUpdate.value = update
    }
  }, 3000)
})
</script>

<template>
  <MainLayout />
  <FpNotificationContainer />

  <!-- Update Banner -->
  <transition name="slide-up">
    <div v-if="availableUpdate" class="update-banner">
      <div class="icon-wrap">
        <Download :size="20" />
      </div>
      <div class="update-text">
        <span class="update-title">Доступна версия {{ availableUpdate.version }}</span>
        <span class="update-notes">{{ availableUpdate.notes }}</span>
      </div>
      <div class="update-actions">
        <button class="btn-dismiss" @click="dismissUpdate">Позже</button>
        <button class="btn-install" @click="installUpdate">Установить</button>
      </div>
    </div>
  </transition>
</template>

<style lang="scss">
// Global resets if needed
</style>

<style scoped lang="scss">
.update-banner {
  position: fixed;
  bottom: 72px; // above bottom nav
  left: 12px;
  right: 12px;
  background: var(--color-surface);
  border: 1.5px solid var(--color-primary);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-2);
  z-index: 9000;
}

.update-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.update-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.update-notes {
  font-size: 12px;
  color: var(--color-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.update-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.btn-dismiss {
  padding: 7px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.btn-install {
  padding: 7px 14px;
  border: none;
  border-radius: 10px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(20px);
  opacity: 0;
}

.icon-wrap {
  width: 40px;
  height: 40px;
  background: color-mix(in srgb, var(--color-primary) 15%, transparent);
  color: var(--color-primary);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
