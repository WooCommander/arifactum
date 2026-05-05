<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useRouter, useRoute, onBeforeRouteLeave } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { routeService } from '../services/routeService'
import { authStore } from '@/modules/auth/store/authStore'
import { useCategoryStore } from '../state/useCategoryStore'
import { FpBackButton, FpInput, FpButton, FpSpinner, FpImageUpload, FpConfirmationModal } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { Save, Plus, Trash2, MapPin, Star, X as CloseIcon, MapPinOff } from 'lucide-vue-next'
import { Haptics } from '@capacitor/haptics'
import { LocationService } from '@/shared/lib/LocationService'

const router = useRouter()
const route = useRoute()
const { fetchRoutes } = useRoutesStore()
const { categoryNames, addCategory, init: initCategories } = useCategoryStore()

const routeId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!routeId.value)

const title = ref('')
const description = ref('')
const difficulty = ref<'easy' | 'medium' | 'hard'>('medium')
const images = ref<string[]>([])
const coverUrl = ref<string | null>(null)
const isSaving = ref(false)
const skipDirtyCheck = ref(false)
const isLoading = ref(false)
const category = ref('')
const tags = ref<string[]>([])
const tagInput = ref('')
const isAddingCategory = ref(false)
const newCategoryName = ref('')
const userLocation = ref<[number, number] | undefined>(undefined)
const mapCenter = ref<[number, number] | undefined>(undefined)
const currentStep = ref(1)
const steps = [
  { id: 1, title: 'Основное' },
  { id: 2, title: 'Маршрут' },
  { id: 3, title: 'Медиа' }
]


interface CheckpointForm {
  id: string
  title: string
  description: string
  lat: number
  lng: number
  order_index: number
  photo_url: string | null
  images: string[]
}

const checkpoints = ref<CheckpointForm[]>([
  { id: Math.random().toString(36).substr(2, 9), title: '', description: '', lat: 0, lng: 0, order_index: 0, photo_url: null, images: [] }
])

const DRAFT_KEY = 'artifactum_route_draft'

// Dirty check logic
const isDirty = computed(() => {
  if (isSaving.value || skipDirtyCheck.value) return false
  return title.value !== '' ||
    description.value !== '' ||
    images.value.length > 0 ||
    checkpoints.value.some(cp => cp.title !== '' || cp.lat !== 0)
})

const showLeaveConfirm = ref(false)
const pendingRoute = ref<any>(null)

onBeforeRouteLeave((to, from, next) => {
  if (isDirty.value) {
    pendingRoute.value = to
    showLeaveConfirm.value = true
    return next(false)
  }
  next()
})

const handleConfirmLeave = () => {
  skipDirtyCheck.value = true
  showLeaveConfirm.value = false
  if (pendingRoute.value) {
    router.push(pendingRoute.value)
  }
}

const handleCancelLeave = () => {
  pendingRoute.value = null
  showLeaveConfirm.value = false
}

// Auto-save logic
const saveDraft = () => {
  if (isEditMode.value || isSaving.value) return

  const draft = {
    title: title.value,
    description: description.value,
    difficulty: difficulty.value,
    images: images.value,
    coverUrl: coverUrl.value,
    category: category.value,
    tags: tags.value,
    checkpoints: checkpoints.value,
    currentStep: currentStep.value
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
}

const restoreDraft = () => {
  if (isEditMode.value) return

  const saved = localStorage.getItem(DRAFT_KEY)
  if (!saved) return

  try {
    const draft = JSON.parse(saved)
    title.value = draft.title || ''
    description.value = draft.description || ''
    difficulty.value = draft.difficulty || 'medium'
    images.value = draft.images || []
    coverUrl.value = draft.coverUrl || null
    category.value = draft.category || ''
    tags.value = draft.tags || []
    checkpoints.value = draft.checkpoints || [{ title: '', description: '', lat: 0, lng: 0, order_index: 0, photo_url: null, images: [] }]
    currentStep.value = draft.currentStep || 1
  } catch (e) {
    console.error('Failed to restore draft:', e)
  }
}

const clearDraft = () => {
  localStorage.removeItem(DRAFT_KEY)
}

const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault()
    e.returnValue = ''
  }
}

watch([title, description, difficulty, images, coverUrl, category, tags, checkpoints, currentStep], () => {
  saveDraft()
}, { deep: true })

const nextStep = () => {
  if (currentStep.value < 3) currentStep.value++
}

const prevStep = () => {
  if (currentStep.value > 1) currentStep.value--
}

const mapPoints = computed(() =>
  checkpoints.value
    .filter(cp => cp.lat !== 0 || cp.lng !== 0)
    .map((cp, index) => ({
      lat: cp.lat,
      lng: cp.lng,
      id: cp.id,
      title: cp.title || `Точка ${index + 1}`
    }))
)

const activeMarkerIndex = ref<number | null>(null)
const showDeleteConfirm = ref(false)
const indexToDelete = ref<number | null>(null)
const draggedIndex = ref<number | null>(null)
const geocodingIndices = ref<Set<number>>(new Set())

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI / 180
  const φ2 = lat2 * Math.PI / 180
  const Δφ = (lat2 - lat1) * Math.PI / 180
  const Δλ = (lon2 - lon1) * Math.PI / 180
  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

function formatDistance(meters: number) {
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} км`
  return `${Math.round(meters)} м`
}

const checkpointDistances = computed(() => {
  return checkpoints.value.map((cp, index) => {
    if (index === checkpoints.value.length - 1) return null
    const next = checkpoints.value[index + 1]
    if (!cp.lat || !cp.lng || !next.lat || !next.lng) return null
    return calculateDistance(cp.lat, cp.lng, next.lat, next.lng)
  })
})

onMounted(async () => {
  initCategories().then(() => {
    if (!category.value && categoryNames.value.length > 0) {
      category.value = categoryNames.value[0]
    }
  })

  if (!isEditMode.value) {
    restoreDraft()
  }

  window.addEventListener('beforeunload', handleBeforeUnload)

  if (isEditMode.value) {
    isLoading.value = true
    try {
      const id = routeId.value!
      const [routeData, checkpointData] = await Promise.all([
        routeService.getRouteById(id),
        routeService.getCheckpoints(id)
      ])

      title.value = routeData.title
      description.value = routeData.description
      difficulty.value = routeData.difficulty
      coverUrl.value = routeData.image_url
      images.value = [...(routeData.images || [])]
      category.value = routeData.category || ''
      tags.value = [...(routeData.tags || [])]

      if (checkpointData.length > 0) {
        checkpoints.value = checkpointData.map(cp => ({
          id: cp.id || Math.random().toString(36).substr(2, 9),
          title: cp.title,
          description: cp.description,
          lat: cp.lat,
          lng: cp.lng,
          order_index: cp.order_index,
          photo_url: cp.photo_url,
          images: [...(cp.images || [])]
        }))

        // Центрируем на первой точке при редактировании
        if (checkpoints.value[0].lat !== 0) {
          mapCenter.value = [checkpoints.value[0].lat, checkpoints.value[0].lng]
        }
      }
    } catch (err) {
      console.error('Failed to load route for editing:', err)
      alert('Ошибка при загрузке маршрута')
      router.back()
    } finally {
      isLoading.value = false
    }
  }

  // Получаем текущую геопозицию автора
  try {
    const pos = await LocationService.getCurrentPosition()
    userLocation.value = [pos.latitude, pos.longitude]

    // Если это новый маршрут - центрируем на пользователе
    if (!isEditMode.value) {
      mapCenter.value = userLocation.value
    }
  } catch (err) {
    console.warn('Could not get initial creator location:', err)
  }
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
})

const handleMapClick = async (lat: number, lng: number) => {
  let targetIndex = -1

  if (activeMarkerIndex.value !== null) {
    targetIndex = activeMarkerIndex.value
    const cp = checkpoints.value[targetIndex]
    cp.lat = Number(lat.toFixed(6))
    cp.lng = Number(lng.toFixed(6))
    activeMarkerIndex.value = null
  } else {
    const firstCp = checkpoints.value[0]
    if (checkpoints.value.length === 1 && !firstCp.title && firstCp.lat === 0) {
      targetIndex = 0
      firstCp.lat = Number(lat.toFixed(6))
      firstCp.lng = Number(lng.toFixed(6))
      activeMarkerIndex.value = 0
    } else {
      targetIndex = 0
      checkpoints.value.unshift({
        id: Math.random().toString(36).substr(2, 9),
        title: '',
        description: '',
        lat: Number(lat.toFixed(6)),
        lng: Number(lng.toFixed(6)),
        order_index: checkpoints.value.length + 1,
        photo_url: null,
        images: [] as string[]
      })
      // Пересчитываем индексы: нижняя (старая) — 1, верхняя (новая) — N
      checkpoints.value.forEach((cp, i) => cp.order_index = checkpoints.value.length - i)
      activeMarkerIndex.value = 0
    }
  }

  // Автоматическое получение адреса
  if (targetIndex !== -1) {
    const cp = checkpoints.value[targetIndex]
    geocodingIndices.value.add(targetIndex)
    try {
      const address = await LocationService.reverseGeocode(lat, lng)
      if (address && (!cp.title || cp.title === 'Без названия')) {
        cp.title = address
      }
    } finally {
      geocodingIndices.value.delete(targetIndex)
    }
  }
}

const handleMarkerDragEnd = async (id: string, lat: number, lng: number) => {
  const index = checkpoints.value.findIndex(cp => cp.id === id)
  if (index !== -1) {
    const cp = checkpoints.value[index]
    cp.lat = Number(lat.toFixed(6))
    cp.lng = Number(lng.toFixed(6))
    
    // При перетаскивании тоже обновляем адрес, если название не кастомное
    geocodingIndices.value.add(index)
    try {
      const address = await LocationService.reverseGeocode(lat, lng)
      if (address) {
        cp.title = address
      }
    } finally {
      geocodingIndices.value.delete(index)
    }
  }
}

const addCheckpoint = () => {
  checkpoints.value.unshift({
    id: Math.random().toString(36).substr(2, 9),
    title: '',
    description: '',
    lat: 0,
    lng: 0,
    order_index: 0,
    photo_url: null,
    images: [] as string[]
  })
  checkpoints.value.forEach((cp, i) => cp.order_index = i)
  activeMarkerIndex.value = 0
}

const addImage = (target: string[] | { images: string[] }, url: string) => {
  if (!url) return
  if (Array.isArray(target)) {
    target.push(url)
  } else {
    target.images.push(url)
  }
}

const removeImage = (target: string[], index: number) => {
  target.splice(index, 1)
}

const setCover = (item: { photo_url?: string | null, image_url?: string | null }, url: string) => {
  if ('photo_url' in item) item.photo_url = url
  else coverUrl.value = url
}

const removeCheckpoint = (index: number) => {
  checkpoints.value.splice(index, 1)
  checkpoints.value.forEach((cp, i) => cp.order_index = i)
  if (checkpoints.value.length === 0) addCheckpoint()
}

const requestDeleteCheckpoint = (index: number) => {
  indexToDelete.value = index
  showDeleteConfirm.value = true
}

const confirmDeleteCheckpoint = () => {
  if (indexToDelete.value !== null) {
    checkpoints.value.splice(indexToDelete.value, 1)
    checkpoints.value.forEach((cp, i) => cp.order_index = checkpoints.value.length - i)
    indexToDelete.value = null
  }
  showDeleteConfirm.value = false
}

const onDragStart = (index: number) => {
  draggedIndex.value = index
}

const onDrop = (index: number) => {
  if (draggedIndex.value === null) return
  const item = checkpoints.value.splice(draggedIndex.value, 1)[0]
  checkpoints.value.splice(index, 0, item)
  checkpoints.value.forEach((cp, i) => cp.order_index = checkpoints.value.length - i)
  draggedIndex.value = null
}

const isLocating = ref<number | null>(null)

const captureCurrentLocation = async (index: number) => {
  isLocating.value = index
  try {
    const coords = await LocationService.getCurrentPosition()

    const cp = checkpoints.value[index]
    cp.lat = Number(coords.latitude.toFixed(6))
    cp.lng = Number(coords.longitude.toFixed(6))

    await Haptics.vibrate()
  } catch (e) {
    console.error('Failed to get location:', e)
    alert('Не удалось определить местоположение. Проверьте разрешения GPS.')
  } finally {
    isLocating.value = null
  }
}

const addTag = () => {
  const val = tagInput.value.trim().replace(/^#/, '')
  if (val && !tags.value.includes(val)) {
    tags.value.push(val)
  }
  tagInput.value = ''
}

const removeTag = (index: number) => {
  tags.value.splice(index, 1)
}

const handleAddCategory = async () => {
  if (!newCategoryName.value.trim()) return
  const newCat = await addCategory(newCategoryName.value.trim())
  if (newCat) {
    category.value = newCat.name
    newCategoryName.value = ''
    isAddingCategory.value = false
  }
}

const handleSave = async () => {
  if (!title.value) return
  if (!authStore.user.value) return

  isSaving.value = true
  try {
    const routeData = {
      title: title.value,
      description: description.value,
      difficulty: difficulty.value,
      author_id: authStore.user.value.id,
      image_url: coverUrl.value,
      images: images.value,
      status: 'draft' as const,
      category: category.value,
      tags: tags.value,
      is_public: true
    }

    let savedRouteId = routeId.value

    if (isEditMode.value && routeId.value) {
      await routeService.updateRoute(routeId.value, routeData)
      await routeService.deleteCheckpointsByRoute(routeId.value)
    } else {
      const newRoute = await routeService.createRoute(routeData)
      savedRouteId = newRoute.id
    }

    // Save checkpoints
    if (!savedRouteId) throw new Error('ID маршрута не получен')
    
    await Promise.all(checkpoints.value.map(cp => {
      return routeService.createCheckpoint({
        title: cp.title,
        description: cp.description,
        lat: cp.lat,
        lng: cp.lng,
        order_index: cp.order_index,
        photo_url: cp.photo_url,
        images: cp.images,
        route_id: savedRouteId!
      })
    }))

    await fetchRoutes(authStore.currentUserId.value)
    clearDraft()
    skipDirtyCheck.value = true
    router.push({ name: 'RouteDetail', params: { id: savedRouteId } })
  } catch (err: any) {
    console.error('Failed to save route:', err)
    const errorMsg = err.message || 'Ошибка при сохранении'
    alert(`Ошибка: ${errorMsg}`)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="create-route-view">
    <header class="header">
      <FpBackButton @click="currentStep === 1 ? router.back() : prevStep()" />
      <div class="header-content">
        <h1>{{ isEditMode ? 'Редактировать' : 'Новый маршрут' }}</h1>
        <span class="step-badge">Шаг {{ currentStep }} из 3</span>
      </div>
    </header>

    <div class="step-indicator">
      <div v-for="s in steps" :key="s.id" class="step-dot"
        :class="{ active: currentStep === s.id, completed: currentStep > s.id }"></div>
    </div>

    <div v-if="isLoading" class="loader-overlay">
      <FpSpinner />
      <p>Загрузка данных...</p>
    </div>

    <div v-else class="form-content">
      <!-- STEP 1: BASIC INFO -->
      <section v-if="currentStep === 1" class="basic-info-step">
        <div class="section-card">
          <FpInput v-model="title" label="Название маршрута" placeholder="Например: Тайны центра" autofocus />

          <div class="input-group">
            <label>Категория</label>
            <div class="category-picker">
              <button v-for="cat in categoryNames" :key="cat" :class="{ active: category === cat }"
                @click="category = cat">
                {{ cat }}
              </button>
              <button class="add-cat-btn" @click="isAddingCategory = true">
                <Plus :size="16" />
              </button>
            </div>

            <div v-if="isAddingCategory" class="add-category-form">
              <input v-model="newCategoryName" placeholder="Новая категория..."
                @keydown.enter.prevent="handleAddCategory" />
              <div class="actions">
                <FpButton size="sm" @click="handleAddCategory">Ок</FpButton>
                <FpButton size="sm" variant="secondary" @click="isAddingCategory = false">Отмена</FpButton>
              </div>
            </div>
          </div>

          <div class="input-group">
            <label>Сложность</label>
            <div class="difficulty-picker">
              <button v-for="d in (['easy', 'medium', 'hard'] as const)" :key="d"
                :class="{ active: difficulty === d, [d]: true }" @click="difficulty = d">
                {{ d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно' }}
              </button>
            </div>
          </div>

          <div class="input-group">
            <label>Теги</label>
            <div class="tags-input-wrapper">
              <div class="tags-list">
                <span v-for="(tag, idx) in tags" :key="idx" class="tag-chip">
                  #{{ tag }}
                  <button @click="removeTag(idx)">
                    <CloseIcon :size="12" />
                  </button>
                </span>
              </div>
              <input v-model="tagInput" placeholder="Добавить тег..." @keydown.enter.prevent="addTag"
                @keydown.space.prevent="addTag" @blur="addTag" />
            </div>
          </div>

          <div class="input-group">
            <label>Описание</label>
            <textarea v-model="description" placeholder="О чем этот маршрут..."></textarea>
          </div>
        </div>
      </section>

      <!-- STEP 2: ROUTE & MAP -->
      <section v-if="currentStep === 2" class="route-map-step">
        <div class="map-container-sticky">
          <ArtMap class="creation-map" :points="mapPoints" :center="mapCenter" :user-location="userLocation" show-path
            draggable-markers @map-click="handleMapClick" @marker-drag-end="handleMarkerDragEnd" />
          <div class="map-hint">
            <MapPin :size="14" />
            <span>Нажмите на карту, чтобы добавить точку</span>
          </div>
        </div>

        <div class="checkpoints-section">
          <div class="section-header">
            <h2>Точки ({{ checkpoints.length }})</h2>
            <FpButton variant="text" size="sm" @click="addCheckpoint">
              <Plus :size="20" /> Добавить
            </FpButton>
          </div>

          <TransitionGroup name="list" tag="div" class="cp-list">
            <div v-for="(cp, index) in checkpoints" :key="cp.id" class="cp-compact-card"
              :class="{ active: activeMarkerIndex === index, 'is-dragging': draggedIndex === index }"
              draggable="true"
              @dragstart="onDragStart(index)"
              @dragover.prevent
              @drop="onDrop(index)">
              <div class="cp-main-row" @click="activeMarkerIndex = activeMarkerIndex === index ? null : index">
                <span class="cp-number">{{ cp.order_index }}</span>
                <div class="cp-info">
                  <span class="cp-title">{{ cp.title || 'Без названия' }}</span>
                  <span class="cp-coords" v-if="cp.lat">{{ cp.lat }}, {{ cp.lng }}</span>
                </div>
                <div class="cp-actions">
                  <button class="delete-cp" @click.stop="requestDeleteCheckpoint(index)">
                    <Trash2 :size="18" />
                  </button>
                </div>
              </div>

              <!-- Distance info -->
              <div v-if="checkpointDistances[index]" class="cp-distance-line">
                <div class="line-dot"></div>
                <span>{{ formatDistance(checkpointDistances[index]!) }} до следующей</span>
              </div>

              <div v-if="activeMarkerIndex === index" class="cp-details-form">
                <FpInput v-model="cp.title" label="Название точки" :loading="geocodingIndices.has(index)" />
                <FpInput v-model="cp.description" label="Задание/Описание" />

                <div class="cp-actions-row">
                  <FpButton variant="outline" size="sm" class="capture-gps-btn-small" :disabled="isLocating !== null"
                    @click="captureCurrentLocation(index)">
                    <FpSpinner v-if="isLocating === index" size="sm" />
                    <span v-else class="btn-content">
                      <MapPinOff :size="16" />
                      <span>Я здесь!</span>
                    </span>
                  </FpButton>

                  <div class="cp-mini-gallery">
                    <FpImageUpload label="Фото точки" size="sm" @uploaded="addImage(cp, $event)" />
                    <div class="cp-previews">
                      <img v-for="(img, idx) in cp.images" :key="idx" :src="img" @click="removeImage(cp.images, idx)" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TransitionGroup>
        </div>
      </section>

      <!-- STEP 3: MEDIA & SAVE -->
      <section v-if="currentStep === 3" class="media-step">
        <div class="section-card">
          <label class="section-label">Обложка и галерея</label>
          <p class="section-hint">Загрузите фотографии, которые будут отображаться в карточке маршрута</p>

          <FpImageUpload label="Загрузить фото" @uploaded="addImage(images, $event)" />

          <div v-if="images.length > 0" class="image-previews">
            <div v-for="(img, idx) in images" :key="idx" class="image-card" :class="{ isCover: coverUrl === img }">
              <img :src="img" alt="preview" />
              <div class="image-actions">
                <button class="img-btn star" @click="setCover({}, img)">
                  <Star :size="16" :fill="coverUrl === img ? 'currentColor' : 'none'" />
                </button>
                <button class="img-btn delete" @click="removeImage(images, idx)">
                  <CloseIcon :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="route-summary section-card">
          <h3>Готово к публикации?</h3>
          <div class="summary-item">
            <strong>Название:</strong> {{ title }}
          </div>
          <div class="summary-item">
            <strong>Точек:</strong> {{ checkpoints.length }}
          </div>
          <div class="summary-item">
            <strong>Категория:</strong> {{ category }}
          </div>
        </div>
      </section>
    </div>

    <div class="sticky-navigation">
      <FpButton v-if="currentStep > 1" variant="secondary" class="nav-btn" @click="prevStep">
        Назад
      </FpButton>

      <FpButton v-if="currentStep < 3" class="nav-btn" :disabled="currentStep === 1 && !title" @click="nextStep">
        Далее
      </FpButton>

      <FpButton v-if="currentStep === 3" class="nav-btn save-btn" :disabled="isSaving || !title" @click="handleSave">
        <FpSpinner v-if="isSaving" size="sm" />
        <span v-else class="btn-content">
          <Save :size="20" /> {{ isEditMode ? 'Сохранить' : 'Создать' }}
        </span>
      </FpButton>
    </div>
    <FpConfirmationModal
      v-model:visible="showLeaveConfirm"
      title="Несохраненные изменения"
      message="Вы уверены, что хотите покинуть страницу? Все введенные данные будут потеряны."
      confirmText="Уйти"
      cancelText="Остаться"
      variant="danger"
      @confirm="handleConfirmLeave"
      @cancel="handleCancelLeave"
    />

    <FpConfirmationModal
      v-model:visible="showDeleteConfirm"
      title="Удалить точку?"
      message="Вы уверены, что хотите удалить эту точку маршрута?"
      confirmText="Удалить"
      variant="danger"
      @confirm="confirmDeleteCheckpoint"
    />
  </div>
</template>

<style scoped lang="scss">
.create-route-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: 120px;
}

.header {
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    display: flex;
    flex-direction: column;

    h1 {
      font-size: 18px;
      font-weight: 800;
      margin: 0;
    }

    .step-badge {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--color-text-tertiary);
      font-weight: 700;
    }
  }
}

.step-indicator {
  display: flex;
  gap: 8px;
  padding: 12px 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  .step-dot {
    flex: 1;
    height: 4px;
    background: var(--color-border);
    border-radius: 2px;
    transition: all 0.3s ease;

    &.active {
      background: var(--color-primary);
      box-shadow: 0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent);
    }

    &.completed {
      background: var(--color-success);
    }
  }
}

.form-content {
  padding: 20px;
}

.section-card {
  background: var(--color-surface);
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-label {
  font-size: 16px;
  font-weight: 800;
  color: var(--color-text-primary);
}

.section-hint {
  font-size: 13px;
  color: var(--color-text-tertiary);
  margin-top: -12px;
  line-height: 1.4;
}

.map-container-sticky {
  position: sticky;
  top: 80px;
  z-index: 10;
  margin-bottom: 24px;
}

.creation-map {
  height: 30vh;
  min-height: 240px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.map-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11px;
  color: var(--color-text-tertiary);
  margin-top: 8px;
  background: var(--color-surface);
  padding: 4px 12px;
  border-radius: var(--radius-pill);
  width: fit-content;
  margin-inline: auto;
  border: 1px solid var(--color-border);
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 700;
    color: var(--color-text-secondary);
  }

  textarea {
    min-height: 120px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-background);
    padding: 12px;
    font-family: inherit;
    font-size: 16px;
    resize: none;
    color: var(--color-text-primary);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.difficulty-picker {
  display: flex;
  gap: 8px;

  button {
    flex: 1;
    padding: 12px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-background);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;
    color: var(--color-text-secondary);

    &.active {
      color: white;
      border-color: transparent;

      &.easy {
        background: var(--color-success);
      }

      &.medium {
        background: var(--color-warning);
      }

      &.hard {
        background: var(--color-error);
      }
    }
  }
}

.category-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;

  button {
    padding: 8px 16px;
    border-radius: var(--radius-pill);
    border: 1.5px solid var(--color-border);
    background: var(--color-background);
    color: var(--color-text-secondary);
    font-size: 13px;
    font-weight: 600;
    transition: all 0.2s;

    &.active {
      background: var(--color-primary);
      border-color: var(--color-primary);
      color: var(--color-on-primary);
    }
  }

  .add-cat-btn {
    width: 36px;
    height: 36px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-style: dashed;
  }
}

.tags-input-wrapper {
  background: var(--color-background);
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .tag-chip {
    background: var(--color-surface);
    color: var(--color-primary);
    padding: 4px 10px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 700;
    display: flex;
    align-items: center;
    gap: 4px;
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);

    button {
      background: none;
      border: none;
      color: var(--color-text-tertiary);
      padding: 0;
      cursor: pointer;
    }
  }

  input {
    background: none;
    border: none;
    outline: none;
    padding: 4px;
    color: var(--color-text-primary);
    font-size: 14px;
  }
}

.cp-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cp-compact-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.3s ease;

  &.active {
    border-color: var(--color-primary);
    box-shadow: var(--shadow-md);
  }

  .cp-main-row {
    padding: 12px 16px;
    display: flex;
    align-items: center;
    gap: 12px;
    cursor: pointer;

    .cp-number {
      width: 28px;
      height: 28px;
      background: var(--color-background);
      color: var(--color-text-secondary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 13px;
      border: 1px solid var(--color-border);
    }

    .cp-info {
      flex: 1;
      display: flex;
      flex-direction: column;

      .cp-title {
        font-weight: 700;
        font-size: 14px;
        color: var(--color-text-primary);
      }

      .cp-coords {
        font-size: 11px;
        color: var(--color-text-tertiary);
        font-family: monospace;
      }
    }

    .delete-cp {
      color: var(--color-error);
      opacity: 0.6;
      background: none;
      border: none;
      padding: 8px;

      &:hover {
        opacity: 1;
      }
    }
  }

  .cp-details-form {
    padding: 16px;
    border-top: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-background) 50%, transparent);
    display: flex;
    flex-direction: column;
    gap: 16px;
  }
}

.active .cp-number {
  background: var(--color-primary) !important;
  color: white !important;
  border-color: var(--color-primary) !important;
}

.cp-actions-row {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-mini-gallery {
  display: flex;
  flex-direction: column;
  gap: 8px;

  .cp-previews {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 4px;

    img {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 8px;
      border: 1px solid var(--color-border);
    }
  }
}

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
}

.image-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid transparent;

  &.isCover {
    border-color: var(--color-primary);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-actions {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    opacity: 0;

    &:hover {
      opacity: 1;
    }
  }

  .img-btn {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;

    &.star {
      background: var(--color-primary);
    }

    &.delete {
      background: var(--color-error);
    }
  }
}

.route-summary {
  h3 {
    margin: 0 0 16px 0;
    font-size: 18px;
  }

  .summary-item {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--color-border);
    font-size: 14px;

    &:last-child {
      border: none;
    }
  }
}

.sticky-navigation {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px 20px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  background: var(--color-surface-translucent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  display: flex;
  gap: 12px;
  z-index: 2000;

  .nav-btn {
    flex: 1;
    height: 52px;
    font-weight: 800;
    font-size: 16px;
  }

  .save-btn {
    background: var(--color-primary);
    color: white;
  }
}

.cp-compact-card {
  &.is-dragging {
    opacity: 0.5;
    background: var(--color-surface-hover);
  }
}

.cp-distance-line {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 48px;
  color: var(--color-text-tertiary);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    left: 26px;
    top: -10px;
    bottom: -10px;
    width: 2px;
    background: repeating-linear-gradient(
      to bottom,
      var(--color-border) 0,
      var(--color-border) 4px,
      transparent 4px,
      transparent 8px
    );
  }

  .line-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-border);
    z-index: 1;
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }

  100% {
    transform: scale(1);
  }
}

.btn-content {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}
</style>
