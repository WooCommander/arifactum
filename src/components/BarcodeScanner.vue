<script setup lang="ts">
import { ref } from 'vue'
import { X } from 'lucide-vue-next'
import { QrcodeStream } from 'vue-qrcode-reader'

const emit = defineEmits<{
  (e: 'scan', barcode: string): void
  (e: 'close'): void
}>()

const error = ref('')

const onDetect = (detectedCodes: any[]) => {
  if (detectedCodes && detectedCodes.length > 0) {
    emit('scan', detectedCodes[0].rawValue)
  }
}

const onError = (err: Error) => {
  if (err.name === 'NotAllowedError') {
    error.value = 'Нет доступа к камере (нужно разрешить в браузере)'
  } else if (err.name === 'NotFoundError') {
    error.value = 'Камера не найдена на устройстве'
  } else if (err.name === 'NotSupportedError') {
    error.value = 'Требуется защищенный доступ (HTTPS или localhost)'
  } else if (err.name === 'NotReadableError') {
    error.value = 'Камера уже используется другим приложением'
  } else if (err.name === 'OverconstrainedError') {
    error.value = 'Камера не удовлетворяет требованиям'
  } else if (err.name === 'StreamApiNotSupportedError') {
    error.value = 'Ваш браузер не поддерживает доступ к камере'
  } else {
    error.value = `Ошибка камеры: ${err.message}`
  }
}
</script>

<template>
  <div class="scanner-overlay" @click.self="emit('close')">
    <div class="scanner-modal">
      <div class="scanner-header">
        <h3 class="scanner-title">Отсканируйте штрих-код</h3>
        <button class="close-btn" @click="emit('close')">
          <X :size="24" />
        </button>
      </div>

      <div class="scanner-body">
        <qrcode-stream v-if="!error" @detect="onDetect" @error="onError">
          <!-- Optional targeting rect -->
          <div class="scanner-frame">
            <div class="scanner-border-tl"></div>
            <div class="scanner-border-tr"></div>
            <div class="scanner-border-bl"></div>
            <div class="scanner-border-br"></div>
          </div>
        </qrcode-stream>
        <div v-else class="scanner-error">
          <div class="camera-icon">📷</div>
          <p>{{ error }}</p>
        </div>
      </div>

      <div class="scanner-footer">
        <p class="scanner-hint">Наведите камеру на штрих-код товара на упаковке</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.scanner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: color-mix(in srgb, var(--color-text-primary) 85%, transparent);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
  padding: 16px;
}

.scanner-modal {
  width: 100%;
  max-width: 400px;
  background: var(--color-surface);
  border-radius: 20px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-2);
}

.scanner-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}

.scanner-title {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.close-btn {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--color-text-secondary);
  padding: 4px;
  display: flex;
  border-radius: 50%;
  transition: background 0.2s;

  &:active {
    background: var(--color-surface-hover);
  }
}

.scanner-body {
  position: relative;
  aspect-ratio: 1;
  width: 100%;
  background: color-mix(in srgb, var(--color-text-primary) 95%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
}

.scanner-error {
  padding: 32px;
  text-align: center;
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;

  .camera-icon {
    font-size: 48px;
    opacity: 0.5;
  }
}

.scanner-hint {
  text-align: center;
  font-size: 13px;
  color: var(--color-text-secondary);
  margin: 0;
  padding: 16px;
}

/* Targeting Reticle visually overlaying the stream */
.scanner-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 70%;
  height: 50%;
  pointer-events: none;

  .scanner-border-tl,
  .scanner-border-tr,
  .scanner-border-bl,
  .scanner-border-br {
    position: absolute;
    width: 30px;
    height: 30px;
    border-color: var(--color-primary);
    border-style: solid;
  }

  .scanner-border-tl {
    top: 0;
    left: 0;
    border-width: 4px 0 0 4px;
    border-top-left-radius: 8px;
  }

  .scanner-border-tr {
    top: 0;
    right: 0;
    border-width: 4px 4px 0 0;
    border-top-right-radius: 8px;
  }

  .scanner-border-bl {
    bottom: 0;
    left: 0;
    border-width: 0 0 4px 4px;
    border-bottom-left-radius: 8px;
  }

  .scanner-border-br {
    bottom: 0;
    right: 0;
    border-width: 0 4px 4px 0;
    border-bottom-right-radius: 8px;
  }
}
</style>
