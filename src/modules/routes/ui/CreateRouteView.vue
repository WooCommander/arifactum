<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { routeService } from '../services/routeService'
import { authStore } from '@/modules/auth/store/authStore'
import { FpBackButton, FpInput, FpButton, FpSpinner, FpImageUpload } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { Save, Plus, Trash2, MapPin, Star, X, MapPinOff } from 'lucide-vue-next'
import { Haptics } from '@capacitor/haptics'
import { LocationService } from '@/shared/lib/LocationService'

const router = useRouter()
const route = useRoute()
const { fetchRoutes } = useRoutesStore()

const routeId = computed(() => route.params.id as string | undefined)
const isEditMode = computed(() => !!routeId.value)

const title = ref('')
const description = ref('')
const difficulty = ref<'easy' | 'medium' | 'hard'>('medium')
const images = ref<string[]>([])
const coverUrl = ref<string | null>(null)
const isSaving = ref(false)
const isLoading = ref(false)
const userLocation = ref<[number, number] | null>(null)

interface CheckpointForm {
  title: string
  description: string
  lat: number
  lng: number
  order_index: number
  photo_url: string | null
  images: string[]
}

const checkpoints = ref<CheckpointForm[]>([
  { title: '', description: '', lat: 0, lng: 0, order_index: 0, photo_url: null, images: [] }
])

const mapPoints = computed(() => 
  checkpoints.value
    .filter(cp => cp.lat !== 0 || cp.lng !== 0)
    .map((cp, index) => ({
      lat: cp.lat,
      lng: cp.lng,
      id: index.toString(),
      title: cp.title || `Точка ${index + 1}`
    }))
)

const activeMarkerIndex = ref<number | null>(null)

onMounted(async () => {
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

      if (checkpointData.length > 0) {
        checkpoints.value = checkpointData.map(cp => ({
          title: cp.title,
          description: cp.description,
          lat: cp.lat,
          lng: cp.lng,
          order_index: cp.order_index,
          photo_url: cp.photo_url,
          images: [...(cp.images || [])]
        }))
      }
    } catch (err) {
      console.error('Failed to load route for editing:', err)
      alert('Ошибка при загрузке маршрута')
      router.back()
    } finally {
      isLoading.value = false
    }
  }

  // Получаем текущую геопозицию автора для центрирования карты
  try {
    const pos = await LocationService.getCurrentPosition()
    userLocation.value = [pos.latitude, pos.longitude]
  } catch (err) {
    console.warn('Could not get initial creator location:', err)
  }
})

const handleMapClick = (lat: number, lng: number) => {
  if (activeMarkerIndex.value !== null) {
    const cp = checkpoints.value[activeMarkerIndex.value]
    cp.lat = Number(lat.toFixed(6))
    cp.lng = Number(lng.toFixed(6))
    activeMarkerIndex.value = null
    return
  }

  const lastCp = checkpoints.value[checkpoints.value.length - 1]
  if (checkpoints.value.length === 1 && !lastCp.title && lastCp.lat === 0) {
    lastCp.lat = Number(lat.toFixed(6))
    lastCp.lng = Number(lng.toFixed(6))
  } else {
    checkpoints.value.push({
      title: '',
      description: '',
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
      order_index: checkpoints.value.length,
      photo_url: null,
      images: [] as string[]
    })
  }
}

const addCheckpoint = () => {
  checkpoints.value.push({
    title: '',
    description: '',
    lat: 0,
    lng: 0,
    order_index: checkpoints.value.length,
    photo_url: null,
    images: [] as string[]
  })
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
      is_public: false
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
    await Promise.all(checkpoints.value.map(cp => 
      routeService.createCheckpoint({
        ...cp,
        route_id: savedRouteId!
      })
    ))

    await fetchRoutes(authStore.currentUserId.value)
    router.push({ name: 'RouteDetail', params: { id: savedRouteId } })
  } catch (err) {
    console.error('Failed to save route:', err)
    alert('Ошибка при сохранении')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="create-route-view">
    <header class="header">
      <FpBackButton @click="router.back()" />
      <h1>{{ isEditMode ? 'Редактировать маршрут' : 'Новый маршрут' }}</h1>
    </header>

    <div v-if="isLoading" class="loader-overlay">
      <FpSpinner />
      <p>Загрузка данных...</p>
    </div>

    <div v-else class="form-content">
      <ArtMap 
        class="creation-map" 
        :points="mapPoints" 
        :center="userLocation"
        :user-location="userLocation"
        @map-click="handleMapClick"
      />
      <div class="map-hint">
        <MapPin :size="14" />
        <span>Нажмите на карту, чтобы быстро добавить новую точку</span>
      </div>

      <section class="basic-info">
        <FpInput 
          v-model="title" 
          label="Название маршрута" 
          placeholder="Например: Тайны центра"
        />
        <div class="input-group">
          <label>Описание</label>
          <textarea v-model="description" placeholder="О чем этот маршрут..."></textarea>
        </div>
        
        <div class="input-group">
          <label>Сложность</label>
          <div class="difficulty-picker">
            <button 
              v-for="d in ['easy', 'medium', 'hard'] as const" 
              :key="d"
              :class="{ active: difficulty === d, [d]: true }"
              @click="difficulty = d"
            >
              {{ d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно' }}
            </button>
          </div>
        </div>

        <div class="gallery-section">
          <label>Галерея маршрута</label>
          <FpImageUpload 
            label="Добавить фото маршрута"
            @uploaded="addImage(images, $event)"
          />
          
          <div v-if="images.length > 0" class="image-previews">
            <div v-for="(img, idx) in images" :key="idx" class="image-card" :class="{ isCover: coverUrl === img }">
              <img :src="img" alt="preview" />
              <div class="image-actions">
                 <button class="img-btn star" @click="setCover({}, img)" :title="coverUrl === img ? 'Обложка' : 'Сделать обложкой'">
                   <Star :size="16" :fill="coverUrl === img ? 'currentColor' : 'none'" />
                 </button>
                 <button class="img-btn delete" @click="removeImage(images, idx)">
                   <X :size="16" />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="checkpoints-section">
        <div class="section-header">
          <h2>Точки маршрута</h2>
          <FpButton variant="text" size="sm" @click="addCheckpoint">
            <Plus :size="20" /> Добавить
          </FpButton>
        </div>

        <div class="cp-list">
          <div v-for="(cp, index) in checkpoints" :key="index" class="cp-form-card">
            <div class="cp-header">
              <span class="cp-number">{{ index + 1 }}</span>
              <button class="delete-cp" @click="removeCheckpoint(index)">
                <Trash2 :size="18" />
              </button>
            </div>
            
            <FpInput v-model="cp.title" label="Название точки" />
            <FpInput v-model="cp.description" label="Задание/Описание" />

            <div class="checkpoint-gallery">
              <label>Картинки точки</label>
              <FpImageUpload 
                label="Загрузить фото точки"
                @uploaded="addImage(cp, $event)"
              />
              <div v-if="cp.images.length > 0" class="image-previews small">
                <div v-for="(img, idx) in cp.images" :key="idx" class="image-card" :class="{ isCover: cp.photo_url === img }">
                  <img :src="img" alt="preview" />
                  <div class="image-actions">
                    <button class="img-btn star" @click="setCover(cp, img)">
                      <Star :size="14" :fill="cp.photo_url === img ? 'currentColor' : 'none'" />
                    </button>
                    <button class="img-btn delete" @click="removeImage(cp.images, idx)">
                      <X :size="14" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="lat-lng-row">
               <div class="coord-field">
                 <FpInput v-model.number="cp.lat" type="number" label="Широта" />
               </div>
               <div class="coord-field">
                 <FpInput v-model.number="cp.lng" type="number" label="Долгота" />
               </div>
            </div>

            <div class="cp-actions-row">
              <FpButton 
                variant="outline" 
                size="sm" 
                class="pick-map-btn"
                :class="{ active: activeMarkerIndex === index }"
                @click="activeMarkerIndex = activeMarkerIndex === index ? null : index"
              >
                <MapPin :size="16" /> 
                <span>{{ activeMarkerIndex === index ? 'Выбор...' : 'Карта' }}</span>
              </FpButton>

              <FpButton 
                variant="primary" 
                size="sm" 
                class="capture-gps-btn"
                :disabled="isLocating !== null"
                @click="captureCurrentLocation(index)"
              >
                <FpSpinner v-if="isLocating === index" size="sm" />
                <template v-else>
                  <MapPinOff :size="16" />
                  <span>Я здесь!</span>
                </template>
              </FpButton>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="actions">
      <FpButton 
        class="save-btn" 
        :disabled="isSaving || !title" 
        @click="handleSave"
      >
        <FpSpinner v-if="isSaving" size="sm" />
        <template v-else>
          <Save :size="20" /> {{ isEditMode ? 'Сохранить изменения' : 'Создать маршрут' }}
        </template>
      </FpButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.create-route-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: 120px;
}

.header {
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  h1 {
    font-size: 20px;
    font-weight: 800;
    margin: 0;
  }
}

.loader-overlay {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 16px;
  color: var(--color-text-secondary);
}

.form-content {
  padding: 20px;
}

.creation-map {
  height: 240px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: 8px;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.map-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-text-tertiary);
  margin-bottom: 24px;
  padding: 0 4px;
}

.gallery-section, .checkpoint-gallery {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;

  label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-secondary);
  }
}

.image-previews {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 12px;
  margin-top: 8px;

  &.small {
    grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  }
}

.image-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.2s;

  &.isCover {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-actions {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,0.4);
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .image-actions, &:active .image-actions {
    opacity: 1;
  }

  .img-btn {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: white;

    &.star { 
      background: var(--color-primary); 
    }
    &.delete { background: var(--color-error); }
  }
}

.basic-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--color-surface);
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  margin-bottom: 32px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-secondary);
  }

  textarea {
    min-height: 100px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    padding: 12px;
    font-family: inherit;
    font-size: 16px;
    resize: none;

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
    padding: 10px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      color: white;
      border-color: transparent;

      &.easy { background: var(--color-success); }
      &.medium { background: var(--color-warning); }
      &.hard { background: var(--color-error); }
    }
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
}

.cp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-form-card {
  background: var(--color-surface);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: -8px;
}

.cp-number {
  width: 24px;
  height: 24px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 12px;
}

.delete-cp {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  padding: 4px;
}

.lat-lng-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.cp-actions-row {
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 12px;
  margin-top: 4px;
}

.pick-map-btn, .capture-gps-btn {
  height: 44px;
  gap: 8px;
  font-size: 14px;
}

.pick-map-btn {
  border-style: dashed;
  
  &.active {
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    border-color: var(--color-primary);
    border-style: solid;
    animation: blink 1.5s infinite;
  }
}

.capture-gps-btn {
  background: var(--color-primary);
  color: white;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--color-primary) 20%, transparent);

  &:active {
    transform: scale(0.96);
  }
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.7; }
  100% { opacity: 1; }
}

.actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: var(--color-surface-translucent);
  backdrop-filter: blur(12px);
  border-top: 1px solid var(--color-border);
  z-index: 1100;
  padding-bottom: calc(20px + env(safe-area-inset-bottom));
}

.save-btn {
  width: 100%;
  height: 56px;
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
}
</style>
