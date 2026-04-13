<script setup lang="ts">
import { ref } from 'vue'
import { uploadImage } from '@/shared/lib/storage'
import { FpSpinner, FpButton } from '@/design-system'
import { Upload, X, AlertCircle } from 'lucide-vue-next'

interface Props {
  label?: string
  bucket?: string
  maxSizeMb?: number
  compress?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Загрузить изображение',
  bucket: 'routes',
  maxSizeMb: 5,
  compress: true,
})

const emit = defineEmits<{
  (e: 'uploaded', url: string): void
  (e: 'error', message: string): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const isUploading = ref(false)
const error = ref<string | null>(null)

function triggerUpload() {
  fileInput.value?.click()
}

async function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  error.value = null

  // Проверка размера
  if (file.size > props.maxSizeMb * 1024 * 1024) {
    const msg = `Файл слишком большой. Максимум ${props.maxSizeMb}МБ`
    error.value = msg
    emit('error', msg)
    return
  }

  isUploading.value = true
  try {
    let fileToUpload = file

    if (props.compress && file.type.startsWith('image/')) {
      fileToUpload = await compressImage(file)
    }

    const url = await uploadImage(fileToUpload, props.bucket)
    emit('uploaded', url)
  } catch (e: any) {
    const msg = e.message || 'Ошибка загрузки'
    error.value = msg
    emit('error', msg)
  } finally {
    isUploading.value = false
    if (fileInput.value) fileInput.value.value = ''
  }
}

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        // Максимальное измерение 1600px
        const MAX_SIDE = 1600
        if (width > height) {
          if (width > MAX_SIDE) {
            height = Math.round((height * MAX_SIDE) / width)
            width = MAX_SIDE
          }
        } else {
          if (height > MAX_SIDE) {
            width = Math.round((width * MAX_SIDE) / height)
            height = MAX_SIDE
          }
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx?.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              })
              resolve(compressedFile)
            } else {
              resolve(file)
            }
          },
          'image/jpeg',
          0.85 // Качество
        )
      }
      img.onerror = (e) => reject(e)
    }
    reader.onerror = (e) => reject(e)
  })
}
</script>

<template>
  <div class="fp-image-upload">
    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      class="hidden-input"
      @change="handleFileChange"
    />

    <FpButton
      variant="outline"
      class="upload-trigger"
      :disabled="isUploading"
      @click="triggerUpload"
    >
      <FpSpinner v-if="isUploading" size="sm" />
      <template v-else>
        <Upload :size="18" />
        <span>{{ props.label }}</span>
      </template>
    </FpButton>

    <div v-if="error" class="error-message">
      <AlertCircle :size="14" />
      <span>{{ error }}</span>
      <button class="clear-error" @click="error = null">
        <X :size="12" />
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fp-image-upload {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hidden-input {
  display: none;
}

.upload-trigger {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  border-style: dashed;
  background: var(--color-surface);
  
  &:hover {
    border-style: solid;
    background: color-mix(in srgb, var(--color-primary) 5%, transparent);
  }
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: color-mix(in srgb, var(--color-error) 10%, transparent);
  color: var(--color-error);
  border-radius: var(--radius-md);
  font-size: 13px;
  font-weight: 600;

  .clear-error {
    margin-left: auto;
    background: none;
    border: none;
    color: inherit;
    display: flex;
    align-items: center;
    cursor: pointer;
    opacity: 0.7;
    
    &:hover {
      opacity: 1;
    }
  }
}
</style>
