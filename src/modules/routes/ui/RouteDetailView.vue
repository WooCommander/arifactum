<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { FpSpinner, FpBackButton, FpConfirmationModal } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { authStore } from '@/modules/auth/store/authStore'
import { MapPin, Info, Navigation, Trash2, Send, Globe, Pencil } from 'lucide-vue-next'
import { Geolocation, type WatchPositionCallback } from '@capacitor/geolocation'
import { locationsService, type TeammateLocation } from '@/modules/teams/services/locationsService'
import { teamService } from '@/modules/teams/services/teamService'
import { getDistance } from '@/shared/lib/geoUtils'
import confetti from 'canvas-confetti'
import { useRewardsStore } from '@/modules/rewards'
import { ArService } from '@/modules/ar/services/ArService'
import ArOverlay from '@/modules/ar/ui/ArOverlay.vue'
import { OfflineService } from '@/modules/offline/services/OfflineService'
import { TileCache } from '@/modules/offline/lib/TileCache'
import { Download, CheckCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { 
  currentRoute, 
  currentCheckpoints, 
  isLoading, 
  error, 
  fetchRouteDetails, 
  clearCurrentRoute,
  deleteRoute,
  publishRoute
} = useRoutesStore()

const isAuthor = computed(() => currentRoute.value?.authorId === authStore.currentUserId.value)
const isDraft = computed(() => currentRoute.value?.status === 'draft')
const isPending = computed(() => currentRoute.value?.status === 'pending')

const showDeleteConfirm = ref(false)
const showPublishConfirm = ref(false)

const handleDelete = async () => {
  try {
    await deleteRoute(currentRoute.value!.id)
    router.push('/routes')
  } catch (e) {
    alert('Ошибка при удалении')
  }
}

const handlePublish = async () => {
  if (!currentRoute.value || isPending.value) return
  try {
    await publishRoute(currentRoute.value!.id)
  } catch (e) {
    alert('Ошибка при публикации')
  }
}

const isActiveMode = ref(false)
const userLocation = ref<[number, number] | null>(null)
const completedCheckpointIds = ref<Set<string>>(new Set())
const watchId = ref<string | null>(null)

// Timer logic
const startTime = ref<number | null>(null)
const elapsedTime = ref('00:00')
let timerInterval: any = null

// Real-time location sharing state
const isSharingLocation = ref(false)
const showTeammateNames = ref(false)
const teammateLocations = ref<TeammateLocation[]>([])
const currentTeamId = ref<string | null>(null)
let locationUpdateInterval: any = null
let locationSubscription: any = null

// AR State
const isArMode = ref(false)

const startArSession = async () => {
  const success = await ArService.start()
  if (success) {
    isArMode.value = true
  }
}

const stopArSession = async () => {
  await ArService.stop()
  isArMode.value = false
}

const onArtifactCapture = async () => {
  await stopArSession()
  handleCheckIn()
}

// Offline Logic
const isDownloading = ref(false)
const isRouteDownloaded = computed(() => OfflineService.isDownloaded(currentRoute.value?.id || ''))

const handleDownload = async () => {
  if (!currentRoute.value || isDownloading.value) return
  
  isDownloading.value = true
  try {
    // 1. Download Data & Images
    await OfflineService.downloadRoute(currentRoute.value, currentCheckpoints.value)
    
    // 2. Warm up Map Cache
    const points: [number, number][] = currentCheckpoints.value.map(cp => [cp.latitude, cp.longitude])
    await TileCache.cacheArea(points, 500)
    
  } catch (e: any) {
    alert(e.message || 'Ошибка при скачивании')
  } finally {
    isDownloading.value = false
  }
}

const handleRemoveOffline = async () => {
  if (!currentRoute.value) return
  if (confirm('Удалить оффлайн-копию маршрута?')) {
    await OfflineService.removeRoute(currentRoute.value.id)
  }
}

const startTimer = () => {
  startTime.value = Date.now()
  timerInterval = setInterval(() => {
    if (!startTime.value) return
    const diff = Math.floor((Date.now() - startTime.value) / 1000)
    const h = Math.floor(diff / 3600)
    const m = Math.floor((diff % 3600) / 60)
    const s = diff % 60
    
    if (h > 0) {
      elapsedTime.value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    } else {
      elapsedTime.value = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
  }, 1000)
}

const stopTimer = () => {
  if (timerInterval) clearInterval(timerInterval)
  timerInterval = null
  // We don't reset elapsedTime here if we want to show it at the end, 
  // but for a new start, startTimer will reset it via startTime.
}

const mapPoints = computed(() => 
  currentCheckpoints.value.map((cp: any, index: number) => ({
    lat: cp.latitude,
    lng: cp.longitude,
    id: cp.id,
    title: cp.title,
    order: cp.order || (index + 1),
    isCompleted: completedCheckpointIds.value.has(cp.id)
  }))
)

const nextCheckpoint = computed(() => {
  return currentCheckpoints.value.find((cp: any) => !completedCheckpointIds.value.has(cp.id))
})

const distanceToNext = computed(() => {
  if (!nextCheckpoint.value || !userLocation.value) return null
  return getDistance(
    userLocation.value[0],
    userLocation.value[1],
    (nextCheckpoint.value as any).latitude,
    (nextCheckpoint.value as any).longitude
  )
})

const formatDistance = (meters: number | null) => {
  if (meters === null) return ''
  if (meters < 1000) return `${Math.round(meters)} м`
  return `${(meters / 1000).toFixed(1)} км`
}

const isNearNext = computed(() => {
  if (distanceToNext.value === null) return false
  return distanceToNext.value <= 50 // 50 meters radius
})

const { awardCompletion } = useRewardsStore()

const handleCheckIn = async () => {
  if (nextCheckpoint.value) {
    completedCheckpointIds.value.add(nextCheckpoint.value.id)
    
    if (completedCheckpointIds.value.size === currentCheckpoints.value.length) {
       confetti({
         particleCount: 150,
         spread: 70,
         origin: { y: 0.6 },
         colors: ['#FFD700', '#1E90FF', '#ffffff']
       })
       
       if (currentRoute.value) {
         try {
           await awardCompletion(currentRoute.value.id, currentRoute.value.title)
         } catch (e) {
           console.error('Failed to award completion:', e)
         }
       }
       
       setTimeout(() => {
         stopTracking()
         isActiveMode.value = false
         alert('Поздравляем! Вы прошли маршрут и получили артефакт!')
       }, 2000)
    }
  }
}

const startTracking = async () => {
  try {
    const status = await Geolocation.checkPermissions()
    if (status.location === 'prompt' || status.location === 'prompt-with-rationale') {
      await Geolocation.requestPermissions()
    } else if (status.location === 'denied') {
      alert('Доступ к геопозиции запрещен. Пожалуйста, разрешите его в настройках телефона для работы навигации.')
      return
    }

    // Initial position
    const pos = await Geolocation.getCurrentPosition()
    userLocation.value = [pos.coords.latitude, pos.coords.longitude]
    
    // Attempt to find user's team for sharing
    try {
      const myTeams = await teamService.getMyTeams()
      if (myTeams.length > 0) {
        currentTeamId.value = myTeams[0].id
      }
    } catch (e) {
      console.warn('Failed to fetch teams', e)
    }

    // Start watching
    const callback: WatchPositionCallback = (position, err) => {
      if (err) {
        console.error('WatchPosition error:', err)
        return
      }
      if (position) {
        userLocation.value = [position.coords.latitude, position.coords.longitude]
      }
    }

    watchId.value = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000
    }, callback)
  } catch (e) {
    console.warn('Geolocation not available', e)
  }
}

const stopTracking = () => {
  if (watchId.value) {
    Geolocation.clearWatch({ id: watchId.value })
    watchId.value = null
  }
}

// Location Sharing Logic
const toggleLocationSharing = async () => {
  if (isSharingLocation.value) {
    stopLocationSharing()
  } else {
    await startLocationSharing()
  }
}

const startLocationSharing = async () => {
  if (!currentTeamId.value || !userLocation.value) {
    alert('Необходимо состоять в команде и иметь активный GPS для шеринга')
    return
  }
  
  isSharingLocation.value = true
  
  // 1. Start periodic updates (every 7 seconds)
  locationUpdateInterval = setInterval(() => {
    if (userLocation.value && currentTeamId.value) {
      locationsService.updateMyLocation(
        currentTeamId.value, 
        userLocation.value[0], 
        userLocation.value[1]
      )
    }
  }, 7000)

  // 2. Subscribe to teammates
  locationSubscription = locationsService.subscribeToTeamLocations(
    currentTeamId.value,
    (locations) => {
      // Filter out self
      teammateLocations.value = locations.filter(l => l.user_id !== authStore.currentUserId.value)
    }
  )
}

const stopLocationSharing = () => {
  isSharingLocation.value = false
  if (locationUpdateInterval) {
    clearInterval(locationUpdateInterval)
    locationUpdateInterval = null
  }
  if (locationSubscription) {
    locationSubscription.unsubscribe()
    locationSubscription = null
  }
  locationsService.clearMyLocation()
  teammateLocations.value = []
}

// React to active mode changes
import { watch } from 'vue'
watch(isActiveMode, (active) => {
  if (active) {
    startTracking()
    startTimer()
  } else {
    stopTracking()
    stopTimer()
    stopLocationSharing()
  }
})

const nextCheckpointLocation = computed<[number, number] | null>(() => {
  if (!isActiveMode.value || !nextCheckpoint.value) return null
  return [nextCheckpoint.value.latitude, nextCheckpoint.value.longitude]
})

// Lifecycle
onMounted(async () => {
  const id = route.params.id as string
  if (id) fetchRouteDetails(id)
  
  // Just a quick check on start, not full tracking yet
  try {
    const pos = await Geolocation.getCurrentPosition()
    userLocation.value = [pos.coords.latitude, pos.coords.longitude]
  } catch (e) {
    console.warn('Initial geolocation fails')
  }
})

onUnmounted(() => {
  stopTracking()
  clearCurrentRoute()
})
</script>

<template>
  <div class="route-detail-view">
    <div v-if="isLoading" class="loader">
      <FpSpinner />
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <FpBackButton @click="router.back()" />
    </div>

    <div v-else-if="currentRoute" class="route-detail-content" :class="{ 'active-mode': isActiveMode }">
      <!-- Active HUD Overlay -->
      <transition name="fade-slide">
        <div v-if="isActiveMode" class="active-hud">
          <div class="hud-top">
            <div class="hud-stat">
              <span class="label">Точка</span>
              <span class="value">{{ completedCheckpointIds.size + 1 }} / {{ currentCheckpoints.length }}</span>
            </div>
            
            <div class="hud-controls">
              <button 
                class="hud-btn" 
                :class="{ active: isSharingLocation }"
                @click="toggleLocationSharing"
                title="Поделиться локацией"
              >
                <MapPin v-if="isSharingLocation" :size="18" />
                <Navigation v-else :size="18" style="opacity: 0.6;" />
              </button>
              <button 
                v-if="isSharingLocation"
                class="hud-btn" 
                :class="{ active: showTeammateNames }"
                @click="showTeammateNames = !showTeammateNames"
                title="Имена игроков"
              >
                <span class="btn-text">ID</span>
              </button>
            </div>

            <div class="hud-timer">
              <span class="label">Время</span>
              <span class="value">{{ elapsedTime }}</span>
            </div>
          </div>

          <div v-if="nextCheckpoint" class="target-card">
            <div class="target-header">
              <span class="target-badge">Текущая цель</span>
              <span class="target-distance" :class="{ near: isNearNext }">
                 <template v-if="userLocation">
                   {{ formatDistance(distanceToNext) }}
                 </template>
                 <template v-else>
                   <span class="gps-waiting">Ожидание GPS...</span>
                 </template>
              </span>
            </div>
            <h3>{{ nextCheckpoint.title }}</h3>
            <p>{{ nextCheckpoint.description }}</p>
          </div>
        </div>
      </transition>

      <div v-if="!isActiveMode" class="route-hero">
        <div v-if="currentRoute.imageUrl" class="hero-image-wrap">
          <img :src="currentRoute.imageUrl" :alt="currentRoute.title" />
          <div class="hero-overlay"></div>
        </div>
        <div v-else class="hero-placeholder">
          <MapPin :size="64" />
        </div>
        
        <div class="hero-header">
           <FpBackButton @click="router.back()" class="back-btn" />
           
           <div v-if="isAuthor" class="author-actions">
             <button class="action-icon edit" @click="router.push(`/edit-route/${currentRoute.id}`)">
               <Pencil :size="20" />
             </button>
             <button class="action-icon delete" @click="showDeleteConfirm = true">
               <Trash2 :size="20" />
             </button>
           </div>
        </div>

        <div v-if="isAuthor" class="status-badge" :class="currentRoute.status">
          {{ currentRoute.status === 'draft' ? 'Черновик' : currentRoute.status === 'pending' ? 'На модерации' : 'Опубликован' }}
        </div>
      </div>

      <div class="route-info-card">
        <h1>{{ currentRoute.title }}</h1>
        <p class="description">{{ currentRoute.description }}</p>
        
        <div class="detail-stats">
          <div class="stat">
            <MapPin :size="20" />
            <span>{{ currentRoute.checkpointsCount }} точек</span>
          </div>
          <div class="stat">
            <Info :size="20" />
            <span :class="currentRoute.difficulty">{{ currentRoute.difficulty }}</span>
          </div>
          <div class="stat">
            <Globe :size="20" />
            <span>{{ currentRoute.isPublic ? 'Публичный' : 'Приватный' }}</span>
          </div>
        </div>

        <!-- Offline Download Button -->
        <div class="offline-actions" v-if="!isAuthor">
          <FpButton 
            v-if="!isRouteDownloaded" 
            variant="outline" 
            size="sm" 
            class="download-btn"
            :disabled="isDownloading"
            @click="handleDownload"
          >
            <FpSpinner v-if="isDownloading" size="sm" />
            <Download v-else :size="18" />
            <span>{{ isDownloading ? 'Скачивание...' : 'Скачать для оффлайн' }}</span>
          </FpButton>
          
          <div v-else class="download-status" @click="handleRemoveOffline">
            <CheckCircle :size="18" class="icon-success" />
            <span>Доступно оффлайн</span>
            <Trash2 :size="16" class="btn-remove" />
          </div>
        </div>

        <div v-if="isAuthor && isDraft" class="publish-block">
          <p>Ваш маршрут пока никто не видит кроме вас.</p>
          <button class="publish-btn" @click="showPublishConfirm = true">
            <Send :size="18" /> Опубликовать
          </button>
        </div>

        <FpConfirmationModal 
          v-model:visible="showDeleteConfirm"
          title="Удаление маршрута"
          message="Вы уверены, что хотите безвозвратно удалить этот маршрут?"
          confirmText="Удалить"
          variant="danger"
          @confirm="handleDelete"
        />

        <FpConfirmationModal 
          v-model:visible="showPublishConfirm"
          title="Публикация"
          message="Отправить маршрут на модерацию? После этого вы не сможете его редактировать до проверки."
          confirmText="Отправить"
          @confirm="handlePublish"
        />
      </div>

      <div class="map-section" :class="{ 'sticky-map': isActiveMode }">
        <h2 v-if="!isActiveMode">Карта маршрута</h2>
        <ArtMap 
          v-if="mapPoints.length > 0" 
          :points="mapPoints" 
          :center="!isActiveMode ? undefined : (userLocation as [number, number])"
          :interactive="!isActiveMode"
          :user-location="userLocation"
          :follow-user="isActiveMode"
          :is-clustered="!isActiveMode"
          :target-location="nextCheckpointLocation"
          :teammates="teammateLocations"
          :show-names="showTeammateNames"
          class="inline-map"
        />
      </div>

      <div class="section">
        <h2>Точки маршрута</h2>
        <div class="checkpoints-list">
          <div 
            v-for="cp in currentCheckpoints" 
            :key="cp.id" 
            class="checkpoint-item"
            :class="{ completed: completedCheckpointIds.has(cp.id), next: nextCheckpoint?.id === cp.id }"
          >
            <div class="checkpoint-number">{{ cp.order }}</div>
            <div class="checkpoint-body">
              <h3>{{ cp.title }}</h3>
              <p>{{ cp.description }}</p>
              
              <div v-if="(cp.images && cp.images.length > 0) || cp.photoUrl" class="checkpoint-gallery">
                <div v-if="cp.photoUrl" class="gallery-thumb main-thumb">
                  <img :src="cp.photoUrl" alt="Main point image" />
                </div>
                <div v-for="(img, idx) in (cp.images || [])" :key="idx" class="gallery-thumb">
                  <img :src="img" alt="Checkpoint image" />
                </div>
              </div>
            </div>
            <div v-if="completedCheckpointIds.has(cp.id)" class="check-icon">✅</div>
          </div>
        </div>
      </div>

      <div class="bottom-action">
        <template v-if="!isActiveMode">
          <button class="start-btn" @click="isActiveMode = true">
            <Navigation :size="20" /> Начать маршрут
          </button>
        </template>
        <template v-else>
          <div class="active-actions">
            <button class="stop-btn" @click="isActiveMode = false">
              Выход
            </button>

            <!-- New AR Seek Button -->
            <button 
              v-if="isNearNext && !isArMode" 
              class="btn-seek-ar" 
              @click="startArSession"
            >
              <Navigation :size="20" />
              <span>Искать</span>
            </button>

            <button 
              class="check-btn" 
              :disabled="!isNearNext || !nextCheckpoint || isArMode"
              @click="handleCheckIn"
            >
              <span v-if="!isNearNext" class="distance-status">
                <template v-if="userLocation">
                  До точки: {{ formatDistance(distanceToNext) }}
                </template>
                <template v-else>
                  Ожидание сигнала GPS...
                </template>
              </span>
              <span v-else>Забрать ({{ (nextCheckpoint as any)?.order || '-' }})</span>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- AR Overlay -->
    <ArOverlay 
      v-if="isArMode" 
      @capture="onArtifactCapture" 
      @close="stopArSession"
    />
  </div>
</template>

<style scoped lang="scss">
.route-detail-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: calc(160px + env(safe-area-inset-bottom));
  transition: padding 0.3s ease;
  
  &.active-mode {
    padding-bottom: calc(240px + env(safe-area-inset-bottom));
  }
}

.map-section {
  padding: 32px 20px 0;
  
  &.sticky-map {
    position: sticky;
    top: 64px; // Below top nav
    z-index: 100;
    padding: 0;
    margin: 0;
    height: 30vh;
    box-shadow: var(--shadow-2);
    
    .inline-map {
      height: 100%;
      border-radius: 0;
      border: none;
      border-bottom: 2px solid var(--color-primary);
    }
  }
}

/* Active HUD Styles */
.active-hud {
  position: fixed;
  top: 64px;
  left: 0;
  right: 0;
  z-index: 1010; // Slightly above header (1000) and sticky map
  background: linear-gradient(to bottom, var(--color-background) 80%, transparent);
  padding: 12px 20px 30px;
  pointer-events: none;
}

.gps-waiting {
  font-size: 14px;
  font-weight: 500;
  color: var(--color-warning);
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 6px;
  
  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--color-warning);
    animation: blink 1s infinite;
  }
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.3; }
  100% { opacity: 1; }
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--color-surface);
  padding: 10px 16px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-2);
  border: 1px solid var(--color-border);
  pointer-events: auto;
  margin-bottom: 12px;
}

.hud-controls {
  display: flex;
  gap: 8px;
  background: var(--color-background);
  padding: 4px;
  border-radius: 12px;
  pointer-events: auto;
  margin: 0 8px;
}

.hud-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: var(--color-text-muted);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &.active {
    background: var(--color-primary);
    color: white;
  }
  
  .btn-text {
    font-size: 10px;
    font-weight: 800;
  }
}

.hud-stat, .hud-timer {
  display: flex;
  flex-direction: column;
  .label {
    font-size: 10px;
    text-transform: uppercase;
    color: var(--color-text-tertiary);
    font-weight: 800;
  }
  .value {
    font-size: 16px;
    font-weight: 800;
    color: var(--color-primary);
    font-family: monospace;
  }
}

.target-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-3);
  border: 1px solid var(--color-primary);
  pointer-events: auto;
  
  .target-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .target-badge {
    font-size: 10px;
    padding: 2px 8px;
    background: color-mix(in srgb, var(--color-primary) 15%, transparent);
    color: var(--color-primary);
    border-radius: 4px;
    font-weight: 800;
    text-transform: uppercase;
  }
  
  .target-distance {
    font-size: 18px;
    font-weight: 900;
    color: var(--color-text-primary);
    
    &.near {
      color: var(--color-success);
      animation: pulse 1.5s infinite;
    }
  }
  
  h3 {
    margin: 0 0 4px;
    font-size: 18px;
    font-weight: 800;
  }
  
  p {
    margin: 0;
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* Transitions */
.fade-slide-enter-active, .fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
.fade-slide-enter-from, .fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

.route-hero {
  height: 280px;
  position: relative;
  background: #f1f5f9;

  .hero-image-wrap {
    width: 100%;
    height: 100%;
    position: relative;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.4) 100%);
    }
  }

  .hero-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-tertiary);
  }

  .hero-header {
    position: absolute;
    top: 12px;
    left: 12px;
    right: 12px;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}

.author-actions {
  display: flex;
  gap: 8px;
}

.action-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.4);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8px);
  cursor: pointer;
  
  &.delete:hover {
    background: var(--color-error);
  }
}

.status-badge {
  position: absolute;
  bottom: 12px;
  right: 12px;
  padding: 6px 12px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 800;
  color: white;
  z-index: 10;
  
  &.draft { background: var(--color-text-tertiary); }
  &.pending { background: var(--color-warning); }
  &.published { background: var(--color-success); }
}

.route-info-card {
  margin: -40px 20px 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-2);
  position: relative;
  z-index: 5;
  border: 1px solid var(--color-border);

  h1 {
    font-size: 24px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 12px;
  }

  .description {
    font-size: 15px;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }
}

.publish-block {
  margin-top: 20px;
  padding: 16px;
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-surface));
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-primary);
  text-align: center;
  
  p {
    font-size: 13px;
    margin-bottom: 12px;
    color: var(--color-text-secondary);
  }
  
  .publish-btn {
    width: 100%;
    padding: 12px;
    background: var(--color-primary);
    color: white;
    border: none;
    border-radius: var(--radius-md);
    font-weight: 800;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
}

.inline-map {
  height: 200px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-align: center;

  svg {
    color: var(--color-primary);
  }

  .easy { color: var(--color-success); }
  .medium { color: var(--color-warning); }
  .hard { color: var(--color-error); }
}

.section {
  padding: 32px 20px 0;

  h2 {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 16px;
    color: var(--color-text-primary);
  }
}

.checkpoints-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkpoint-item {
  display: flex;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;

  &.completed {
    border-color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 5%, var(--color-surface));
    opacity: 0.8;
    .checkpoint-number { background: var(--color-success); }
  }

  &.next {
    border-color: var(--color-primary);
    border-width: 2px;
    box-shadow: var(--shadow-2);
    transform: scale(1.02);
  }
}

.checkpoint-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.checkpoint-body {
  flex: 1;
  h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  p {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0 0 8px;
  }
}

.checkpoint-gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  .gallery-thumb {
    flex: 0 0 80px;
    height: 60px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    &.main-thumb {
       flex: 0 0 100px;
       height: 70px;
       border: 1.5px solid var(--color-primary);
    }
  }
}

.check-icon {
  font-size: 20px;
  margin-left: auto;
}

.active-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.stop-btn {
  flex: 0.5;
  padding: 16px 12px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  font-size: 14px;
  font-weight: 700;
}

.check-btn {
  flex: 1;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  font-size: 16px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  
  &:disabled {
    background: var(--color-text-disabled);
    box-shadow: none;
    opacity: 0.9; // More opaque to read distance
  }

  .distance-status {
    font-size: 12px;
    opacity: 0.8;
    font-weight: 500;
  }
}

.bottom-action {
  position: fixed;
  bottom: calc(88px + env(safe-area-inset-bottom));
  left: 20px;
  right: 20px;
  z-index: 1100;
}

.start-btn {
  width: 100%;
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

  &:active {
    transform: scale(0.98);
  }
}

.btn-seek-ar {
  flex: 1;
  padding: 16px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
  animation: pulse-border 2s infinite;

  span {
    font-size: 14px;
  }

  &:active {
    transform: scale(0.96);
  }
}

@keyframes pulse-border {
  0% { border-color: var(--color-primary); box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-primary) 30%, transparent); }
  70% { border-color: var(--color-primary); box-shadow: 0 0 0 8px transparent; }
  100% { border-color: var(--color-primary); box-shadow: 0 0 0 0 transparent; }
}

.offline-actions {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.download-btn {
  width: 100%;
  gap: 8px;
  border-style: dashed;
}

.download-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--color-surface-hover);
  border-radius: var(--radius-md);
  color: var(--color-success);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;

  .icon-success {
    color: var(--color-success);
  }

  .btn-remove {
    margin-left: auto;
    color: var(--color-text-tertiary);
    
    &:hover {
      color: var(--color-error);
    }
  }
}

.loader, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
}
</style>
