<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { routeService } from '../services/routeService'
import { FpSpinner, FpBackButton, FpConfirmationModal, FpPullToRefresh, FpButton, FpCard, FpInput } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { useNotify } from '@/composables/useNotify'
import { useSocialStore, RouteComments } from '@/modules/social'
import { MuseumService } from '@/modules/profile/services/MuseumService'
import { authStore } from '@/modules/auth/store/authStore'
import ArOverlay from '@/modules/ar/ui/ArOverlay.vue'
import { LocationService, type LocationCoords } from '@/shared/lib/LocationService'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { RewardsService } from '@/modules/rewards/services/RewardsService'
import { ReportsService } from '@/modules/admin/services/ReportsService'
import {
  Heart,
  Bookmark,
  Share2,
  MapPin,
  Clock,
  Zap,
  Info,
  Globe,
  Navigation,
  Pencil,
  Trash2,
  Send,
  Trophy,
  Tag,
  X,
  QrCode,
  AlertTriangle
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const routesStore = useRoutesStore()
const socialStore = useSocialStore()
const { notify } = useNotify()

const routeId = route.params.id as string
const showDeleteConfirm = ref(false)
const showPublishConfirm = ref(false)
const showVictoryModal = ref(false)
const unlockedArtifact = ref<any>(null)
const routeStats = ref<any>(null)
const showExitConfirm = ref(false)

  // Регистрируем глобальный обработчик для гарантированной связи
  ; (window as any).artSelectCheckpoint = (id: string) => {
    handleMarkerClick(id)
  }

// AR State
const isArMode = ref(false)

// Social state
const isLiked = ref(false)
const isFavorite = ref(false)

// Reporting
const showReportModal = ref(false)
const reportReason = ref('')
const isReporting = ref(false)

async function handleReport() {
  if (!reportReason.value.trim()) return
  isReporting.value = true
  try {
    await ReportsService.createReport(routeId, reportReason.value)
    notify('Жалоба отправлена. Мы проверим этот маршрут.', 'success')
    showReportModal.value = false
    reportReason.value = ''
  } catch (e) {
    notify('Ошибка при отправке жалобы', 'error')
  } finally {
    isReporting.value = false
  }
}
const showQrModal = ref(false)
const activeQr = ref<{ url: string; title: string } | null>(null)

function handleShowRouteQr() {
  const url = window.location.href
  activeQr.value = {
    url: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(url)}&choe=UTF-8`,
    title: 'QR-код маршрута'
  }
  showQrModal.value = true
}

function handleShowCheckpointQr(cp: any) {
  // Формируем URL с привязкой к конкретной точке
  const baseUrl = window.location.origin + window.location.pathname
  const url = `${baseUrl}?point=${cp.id}`
  activeQr.value = {
    url: `https://chart.googleapis.com/chart?cht=qr&chs=300x300&chl=${encodeURIComponent(url)}&choe=UTF-8`,
    title: `Точка #${cp.order}: ${cp.title}`
  }
  showQrModal.value = true
}

const { currentRoute, currentCheckpoints, isLoading, error } = routesStore
const isActiveMode = ref(false)
const isAuthor = computed(() => currentRoute.value?.authorId === authStore.currentUserId.value)
const isDraft = computed(() => currentRoute.value?.status === 'draft')

const mapPoints = computed(() => {
  return [...currentCheckpoints.value]
    .sort((a, b) => a.order - b.order)
    .map((cp) => ({
      id: cp.id,
      lat: cp.latitude,
      lng: cp.longitude,
      title: cp.title,
      order: cp.order,
      isCompleted: completedCheckpointIds.value.has(cp.id),
      isActive: nextCheckpoint.value?.id === cp.id
    }))
})

// Active Tracking State
const userLocation = ref<LocationCoords | null>(null)
const completedCheckpointIds = ref(new Set<string>())
const elapsedTime = ref('00:00')
const totalSeconds = ref(0)
let timerInterval: any = null
let locationWatchId: string | null = null
const selectedCheckpoint = ref<any | null>(null)
const isFollowMode = ref(true)
const isCompassMode = ref(false)
const initialActiveCenter = ref<[number, number] | undefined>(undefined)

const sortedCheckpoints = computed(() => {
  return [...currentCheckpoints.value].sort((a, b) => a.order - b.order)
})

// Gesture state for panel
const touchStartY = ref(0)
const touchCurrentY = ref(0)
const isSwiping = ref(false)

const panelTranslateY = computed(() => {
  if (!isSwiping.value) return 0
  const diff = touchCurrentY.value - touchStartY.value
  return diff > 0 ? diff : 0
})

function handleTouchStart(e: TouchEvent) {
  touchStartY.value = e.touches[0].clientY
  touchCurrentY.value = e.touches[0].clientY
  isSwiping.value = true
}

function handleTouchMove(e: TouchEvent) {
  touchCurrentY.value = e.touches[0].clientY
}

function handleTouchEnd() {
  if (panelTranslateY.value > 100) {
    selectedCheckpoint.value = null
  }
  isSwiping.value = false
  touchStartY.value = 0
  touchCurrentY.value = 0
}

// Scroll tracking for premium effects
const scrollY = ref(0)
const isHeaderStuck = computed(() => scrollY.value > 240)

function handleScroll(e: Event) {
  scrollY.value = (e.target as HTMLElement).scrollTop
}

async function handleMarkerClick(id: any) {
  const targetId = String(id).trim()
  const cp = currentCheckpoints.value.find(p => String(p.id).trim() === targetId)

  if (cp) {
    selectedCheckpoint.value = cp
    // Вибрация отдельно, не блокируя UI
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => { })
  } else {
    console.warn('Checkpoint not found by ID:', targetId)
  }
}

const nextCheckpoint = computed(() => {
  return [...currentCheckpoints.value]
    .sort((a, b) => a.order - b.order)
    .find(cp => !completedCheckpointIds.value.has(cp.id))
})

const isLastPoint = computed(() => {
  if (!nextCheckpoint.value || !currentCheckpoints.value.length) return false
  const activeCheckpoints = [...currentCheckpoints.value].sort((a, b) => a.order - b.order)
  return nextCheckpoint.value.id === activeCheckpoints[activeCheckpoints.length - 1].id
})

watch(isActiveMode, (active) => {
  if (active) {
    document.body.style.overflow = 'hidden'
    // Запоминаем начальную точку для карты, чтобы не использовать живой GPS в пропе :center
    if (userLocation.value) {
      initialActiveCenter.value = [userLocation.value.latitude, userLocation.value.longitude]
    } else if (currentCheckpoints.value.length > 0) {
      initialActiveCenter.value = [currentCheckpoints.value[0].latitude, currentCheckpoints.value[0].longitude]
    }
    isFollowMode.value = true
  } else {
    document.body.style.overflow = ''
  }
})

const nextCheckpointLocation = computed<[number, number] | null>(() => {
  if (!nextCheckpoint.value) return null
  return [nextCheckpoint.value.latitude, nextCheckpoint.value.longitude]
})

const distanceToNext = computed(() => {
  if (!userLocation.value || !nextCheckpointLocation.value) return Infinity
  return calculateDistance(
    userLocation.value.latitude, userLocation.value.longitude,
    nextCheckpointLocation.value[0], nextCheckpointLocation.value[1]
  )
})

const isNearNext = computed(() => distanceToNext.value < 50) // 50 meters



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

async function fetchRouteDetails() {
  try {
    await routesStore.fetchRouteDetails(routeId)

    // Fetch social status for the current user
    if (authStore.currentUserId.value) {
      const status = await socialStore.getRouteSocialStatus(routeId, authStore.currentUserId.value)
      isLiked.value = status.isLiked
      isFavorite.value = status.isFavorite
    }
  } catch (e: any) {
    console.error('Failed to load route details', e)
  }
}

function formatDate(dateStr: string) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

async function handleToggleLike() {
  if (!authStore.currentUserId.value) return
  try {
    const newState = await socialStore.toggleLike(routeId, authStore.currentUserId.value)
    isLiked.value = newState
  } catch (e) {
    console.error('Toggle like failed', e)
  }
}

async function handleToggleFavorite() {
  if (!authStore.currentUserId.value) return
  try {
    const newState = await socialStore.toggleFavorite(routeId, authStore.currentUserId.value)
    isFavorite.value = newState
  } catch (e) {
    console.error('Toggle favorite failed', e)
  }
}

async function handleShare() {
  const shareData = {
    title: currentRoute.value?.title || 'Интересный маршрут в Artifactum',
    text: currentRoute.value?.description || 'Посмотри этот маршрут!',
    url: window.location.href
  }

  try {
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      await navigator.share(shareData)
    } else {
      throw new Error('Web Share not supported')
    }
  } catch (err) {
    // Fallback: Copy to clipboard
    try {
      await navigator.clipboard.writeText(window.location.href)
      notify('Ссылка скопирована в буфер обмена!', 'success')
    } catch (clipboardErr) {
      console.error('Share failed entirely', clipboardErr)
      alert('Не удалось поделиться ссылкой')
    }
  }
}


async function handleDelete() {
  await routesStore.deleteRoute(routeId)
  router.push('/routes')
}

async function handlePublish() {
  await routesStore.publishRoute(routeId)
  showPublishConfirm.value = false
}

// AR Actions
function startArSession() {
  isArMode.value = true
}

function stopArSession() {
  isArMode.value = false
}

async function onArtifactCapture() {
  stopArSession()
  await handleCheckIn()
}

async function handleCheckIn() {
  if (!nextCheckpoint.value) return

  completedCheckpointIds.value.add(nextCheckpoint.value.id)

  // If last point, finish route
  if (completedCheckpointIds.value.size === currentCheckpoints.value.length) {
    finishRoute()
  }
}

function handleConfirmExit() {
  isActiveMode.value = false
  showExitConfirm.value = false
  totalSeconds.value = 0
  elapsedTime.value = '00:00'
  completedCheckpointIds.value.clear()
  router.push('/routes')
}

async function finishRoute() {
  isActiveMode.value = false
  clearInterval(timerInterval)

  // Increment completions count
  try {
    await routeService.incrementCompletionsCount(routeId)
  } catch (e) {
    console.error('Failed to increment completions count', e)
  }

  // Unlock Artifact logic
  try {
    if (authStore.currentUserId.value) {
      const artifact = await MuseumService.unlockForRoute(authStore.currentUserId.value, routeId)
      if (artifact) {
        unlockedArtifact.value = artifact
      }
    }
  } catch (e) {
    console.error('Artifact unlock failed', e)
  }

  // Calculate real stats and update profile
  try {
    if (authStore.currentUserId.value) {
      const stats = await RewardsService.finishRoute(
        authStore.currentUserId.value,
        routeId,
        totalSeconds.value,
        sortedCheckpoints.value
      )
      routeStats.value = stats
    }
  } catch (e) {
    console.error('Failed to update rewards', e)
    // Fallback if update fails
    routeStats.value = {
      distanceMeters: 0,
      avgSpeedKmh: 0,
      xpGained: 0,
      levelGained: false
    }
  }

  showVictoryModal.value = true
}

// Lifecycle
onMounted(async () => {
  await fetchRouteDetails()

  // Timer
  timerInterval = setInterval(() => {
    if (isActiveMode.value) {
      totalSeconds.value++
      const m = Math.floor(totalSeconds.value / 60).toString().padStart(2, '0')
      const s = (totalSeconds.value % 60).toString().padStart(2, '0')
      elapsedTime.value = `${m}:${s}`
    }
  }, 1000)

  // Location Tracking
  try {
    locationWatchId = await LocationService.watchPosition((coords) => {
      userLocation.value = coords

      // Check for completion
      if (nextCheckpoint.value && distanceToNext.value < 20) {
        handleCheckIn()
      }
    })
  } catch (e) {
    console.error('Failed to start location tracking:', e)
  }

  // Scroll listener for parallax and sticky effects
  const scrollContainer = document.querySelector('.page-content')
  if (scrollContainer) {
    scrollContainer.addEventListener('scroll', handleScroll)
  }
})

onUnmounted(() => {
  clearInterval(timerInterval)
  if (locationWatchId) {
    LocationService.clearWatch(locationWatchId)
  }

  const scrollContainer = document.querySelector('.page-content')
  if (scrollContainer) {
    scrollContainer.removeEventListener('scroll', handleScroll)
  }
})
</script>

<template>
  <div class="route-detail-view" :class="{ 'active-mode': isActiveMode }">
    <div v-if="isLoading" class="loader">
      <FpSpinner />
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <FpBackButton @click="router.push('/routes')" />
    </div>

    <div v-else-if="currentRoute" class="route-detail-content">
      <FpPullToRefresh @refresh="fetchRouteDetails">

        <div v-if="!isActiveMode" class="route-hero" :style="{
          transform: `translateY(${scrollY * 0.4}px)`,
          opacity: Math.max(0, 1 - scrollY / 320)
        }">
          <div v-if="currentRoute.imageUrl" class="hero-image-wrap">
            <img :src="currentRoute.imageUrl" :alt="currentRoute.title" />
            <div class="hero-overlay"></div>
          </div>
          <div v-else class="hero-placeholder">
            <MapPin :size="64" />
          </div>

          <div class="hero-header">
            <FpBackButton @click="router.push('/routes')" class="back-btn" />

            <div v-if="isAuthor" class="author-actions">
              <button class="action-icon edit" @click="router.push(`/edit-route/${currentRoute.id}`)">
                <Pencil :size="20" />
              </button>
              <button class="action-icon delete" @click="showDeleteConfirm = true">
                <Trash2 :size="20" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="!isActiveMode" class="route-info-section">
          <div class="sticky-header-wrapper" :class="{ 'is-stuck': isHeaderStuck }">
            <FpBackButton v-if="isHeaderStuck" @click="router.push('/routes')" class="stuck-back-btn" />
            <div class="route-hero-meta">
              <div class="meta-top">
                <div class="category-tag" v-if="currentRoute.category">
                  {{ currentRoute.category }}
                </div>
                <div v-if="isAuthor && currentRoute.status" class="status-badge" :class="currentRoute.status">
                  <span class="status-dot"></span>
                  {{ currentRoute.status === 'draft' ? 'Черновик' : currentRoute.status === 'pending' ? 'На модерации' :
                  'Опубликован' }}
                </div>
              </div>
              <h1 class="route-title">{{ currentRoute.title }}</h1>

              <div class="author-meta-row">
                <div class="author-info-link" @click="router.push(`/profile/${currentRoute.authorId}`)">
                  <div class="author-avatar-mini"
                    :style="currentRoute.authorAvatar ? `background-image: url(${currentRoute.authorAvatar})` : ''">
                    {{ !currentRoute.authorAvatar ? (currentRoute.authorName?.[0] || '?') : '' }}
                  </div>
                  <span class="author-name">{{ currentRoute.authorName }}</span>
                </div>
                <div class="meta-divider"></div>
                <span class="created-date">{{ formatDate(currentRoute.createdAt) }}</span>
              </div>
            </div>

            <div class="social-summary-bar">
              <div class="social-action" :class="{ active: isLiked }" @click="handleToggleLike">
                <Heart :size="24" :fill="isLiked ? 'var(--color-error)' : 'none'" />
                <span>Лайк</span>
              </div>
              <div class="social-action" :class="{ active: isFavorite }" @click="handleToggleFavorite">
                <Bookmark :size="24" :fill="isFavorite ? 'var(--color-primary)' : 'none'" />
                <span>Избранное</span>
              </div>
              <div class="social-action" @click="handleShare">
                <Share2 :size="24" />
                <span>Поделиться</span>
              </div>
              <div class="social-action" @click="handleShowRouteQr">
                <QrCode :size="24" />
                <span>QR-код</span>
              </div>
              <div class="social-action report-action" @click="showReportModal = true">
                <AlertTriangle :size="24" />
                <span>Жалоба</span>
              </div>
            </div>
          </div>

          <div class="route-stats">
            <p class="description">{{ currentRoute.description }}</p>

            <div class="detail-stats">
              <div class="stat">
                <MapPin :size="20" />
                <span>{{ currentCheckpoints.length }} точек</span>
              </div>
              <div class="stat">
                <Trophy :size="20" class="completions-icon" />
                <span>{{ currentRoute.completionsCount || 0 }} прохождений</span>
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

            <!-- Tags -->
            <div class="tags-list" v-if="currentRoute.tags && currentRoute.tags.length">
              <div v-for="tag in currentRoute.tags" :key="tag" class="tag-item">
                <Tag :size="12" />
                <span>{{ tag }}</span>
              </div>
            </div>

            <!-- Comments Section -->
            <RouteComments :route-id="routeId" />

            <div v-if="isAuthor && isDraft" class="publish-block">
              <FpCard class="publish-card">
                <div class="publish-icon-wrap">
                  <Send :size="24" />
                </div>
                <div class="publish-text">
                  <h3>Опубликовать маршрут?</h3>
                  <p>Сейчас ваш маршрут находится в черновиках и виден только вам.</p>
                </div>
                <FpButton variant="primary" @click="showPublishConfirm = true">
                  Опубликовать
                </FpButton>
              </FpCard>
            </div>
          </div>

          <div v-if="!isActiveMode" class="map-section">
            <h2>Карта маршрута</h2>
            <ArtMap class="route-map" :points="mapPoints" :interactive="true"
              :user-location="userLocation ? [userLocation.latitude, userLocation.longitude] : null"
              :is-clustered="false" @marker-click="handleMarkerClick" @map-click="selectedCheckpoint = null" />
          </div>

          <div class="section">
            <h2 v-if="!isActiveMode">Маршрутные точки</h2>
            <div v-if="!isActiveMode" class="checkpoints-list">
              <div v-for="cp in sortedCheckpoints" :key="cp.id" class="checkpoint-item"
                :class="{ completed: completedCheckpointIds.has(cp.id), next: nextCheckpoint?.id === cp.id }"
                @click="Haptics.impact({ style: ImpactStyle.Light }); handleMarkerClick(cp.id)">
                <div class="checkpoint-number">{{ cp.order }}</div>
                <div class="checkpoint-body">
                  <h3>{{ cp.title }}</h3>
                  <p>{{ cp.description }}</p>
                </div>
                <div v-if="completedCheckpointIds.has(cp.id)" class="check-icon">✅</div>
              </div>
            </div>
          </div>
        </div>
      </FpPullToRefresh>

      <div class="bottom-action" v-if="!isActiveMode">
        <button class="start-btn" @click="isActiveMode = true">
          <Navigation :size="20" /> Начать маршрут
        </button>
      </div>
    </div>

    <!-- Modals & Overlays -->
    <ArOverlay v-if="isArMode" @capture="onArtifactCapture" @close="stopArSession" />

    <!-- Навигационный слой (Teleport для мобильной оптимизации) -->
    <Teleport to="body">
      <transition name="fade-slide">
        <div v-if="isActiveMode" class="navigation-layer">
          <div class="active-hud">
            <div class="hud-top-panel">
              <div class="hud-route-header">
                <span class="hud-route-name">{{ currentRoute?.title }}</span>
              </div>

              <div class="hud-stats-bar">
                <div class="hud-stat-item">
                  <span class="label">ТОЧКА</span>
                  <span class="value">{{ completedCheckpointIds.size + 1 }} / {{ currentCheckpoints.length }}</span>
                </div>
                <div class="hud-divider"></div>
                <div class="hud-stat-item">
                  <span class="label">ВРЕМЯ</span>
                  <span class="value">{{ elapsedTime }}</span>
                </div>
              </div>
            </div>

            <div v-if="nextCheckpoint" class="target-card-mini">
              <div class="target-row">
                <div class="target-info-group">
                  <div class="target-meta">
                    <span class="target-label-mini">СЛЕДУЮЩАЯ ЦЕЛЬ</span>
                    <span class="target-order">#{{ nextCheckpoint.order }}</span>
                  </div>
                  <span class="target-title-mini">{{ nextCheckpoint.title }}</span>
                </div>

                <div class="target-actions-wrap">
                  <button class="info-btn" @click="handleShowCheckpointQr(nextCheckpoint)">
                    <QrCode :size="18" />
                  </button>
                  <button class="info-btn" @click="handleMarkerClick(nextCheckpoint.id)">
                    <Info :size="18" />
                  </button>
                  <div class="target-dist-badge">
                    <Navigation :size="12" class="dist-icon" />
                    <span class="dist-value">{{ formatDistance(distanceToNext) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="map-section active-map-section">
            <ArtMap class="route-map full-screen" :points="mapPoints" :center="initialActiveCenter" :interactive="true"
              :user-location="userLocation ? [userLocation.latitude, userLocation.longitude] : null"
              v-model:follow-user="isFollowMode" :is-clustered="false" auto-resume-follow
              :bearing="isCompassMode ? (userLocation?.heading || 0) : 0" :target-location="nextCheckpointLocation"
              @marker-click="handleMarkerClick" @map-click="selectedCheckpoint = null"
              @toggle-compass="isCompassMode = !isCompassMode" />
          </div>

          <div class="active-actions-bottom">
            <FpButton variant="glass" class="exit-action-btn" @click="showExitConfirm = true">
              Выход
            </FpButton>

            <FpButton v-if="isNearNext && !isArMode" variant="primary" class="ar-action-btn" @click="startArSession">
              <Navigation :size="20" /> AR
            </FpButton>

            <FpButton variant="primary" class="target-action-btn" :disabled="!isNearNext || !nextCheckpoint || isArMode"
              @click="handleCheckIn">
              {{ isLastPoint ? 'Финиш' : 'Забрать' }}
            </FpButton>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- QR Code Modal -->
    <Teleport to="body">
      <transition name="fade">
        <div v-if="showQrModal && activeQr" class="modal-overlay" @click.self="showQrModal = false">
          <div class="qr-modal-container">
            <FpCard class="qr-card">
              <div class="qr-header">
                <h3>{{ activeQr.title }}</h3>
                <button class="close-qr" @click="showQrModal = false">
                  <X :size="20" />
                </button>
              </div>

              <div class="qr-content">
                <div class="qr-image-wrap">
                  <img :src="activeQr.url" alt="QR Code" />
                </div>
                <p class="qr-hint">Отсканируйте этот код, чтобы мгновенно перейти к этой локации или поделиться ей.</p>
              </div>

              <FpButton variant="primary" class="qr-done-btn" @click="showQrModal = false">
                Готово
              </FpButton>
            </FpCard>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Глобальная плашка информации о точке -->
    <Teleport to="body">
      <transition name="slide-up">
        <div v-if="selectedCheckpoint" class="checkpoint-detail-panel floating-panel"
          :style="{ transform: `translateY(${panelTranslateY}px)` }" @touchstart="handleTouchStart"
          @touchmove="handleTouchMove" @touchend="handleTouchEnd">

          <div class="panel-handle"></div>

          <div class="panel-header">
            <div class="header-left">
              <div class="point-badge">Точка #{{ selectedCheckpoint.order }}</div>
              <button class="qr-mini-btn" @click="handleShowCheckpointQr(selectedCheckpoint)">
                <QrCode :size="16" />
              </button>
            </div>
            <button class="close-panel" @click="selectedCheckpoint = null">
              <X :size="20" color="white" />
            </button>
          </div>

          <div class="panel-content-scroll">
            <div v-if="selectedCheckpoint.images?.length" class="checkpoint-media">
              <div class="media-row">
                <img v-for="(img, idx) in selectedCheckpoint.images" :key="idx" :src="img" class="checkpoint-img" />
              </div>
            </div>
            <div v-else-if="selectedCheckpoint.photoUrl" class="checkpoint-media">
              <img :src="selectedCheckpoint.photoUrl" class="checkpoint-img single" />
            </div>

            <h3 class="panel-title">{{ selectedCheckpoint.title }}</h3>
            <p class="panel-desc">{{ selectedCheckpoint.description || 'Описание отсутствует' }}</p>
          </div>

          <div class="panel-footer">
            <FpButton variant="primary" size="sm" @click="selectedCheckpoint = null">Понятно</FpButton>
          </div>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <div v-if="showVictoryModal" class="victory-overlay">
        <FpCard class="victory-modal">
          <div class="victory-header">
            <Trophy :size="64" class="trophy-icon" />
            <h2>Маршрут пройден!</h2>
            <p>Вы настоящий исследователь Артефактума</p>
          </div>

          <div class="victory-stats" v-if="routeStats">
            <div class="v-stat">
              <MapPin :size="20" />
              <div class="v-val">{{ routeStats.distanceMeters }} м</div>
              <div class="v-label">Дистанция</div>
            </div>
            <div class="v-stat">
              <Clock :size="20" />
              <div class="v-val">{{ elapsedTime }}</div>
              <div class="v-label">Время</div>
            </div>
            <div class="v-stat">
              <Zap :size="20" />
              <div class="v-val">{{ routeStats.avgSpeedKmh }} км/ч</div>
              <div class="v-label">Скорость</div>
            </div>
          </div>

          <div class="xp-gain" v-if="routeStats">
            <span class="xp-val">+{{ routeStats.xpGained }} XP</span>
            <div class="level-gained" v-if="routeStats.levelGained">НОВЫЙ УРОВЕНЬ!</div>
          </div>

          <!-- New Artifact Reward -->
          <div v-if="unlockedArtifact" class="artifact-reward">
            <div class="reward-divider">
              <span>Найден Артефакт</span>
            </div>
            <div class="reward-card" :class="unlockedArtifact.rarity">
              <div class="reward-glow"></div>
              <img :src="unlockedArtifact.imageUrl" alt="Reward" />
              <div class="reward-info">
                <span class="reward-rarity">{{ unlockedArtifact.rarity }}</span>
                <span class="reward-name">{{ unlockedArtifact.name }}</span>
              </div>
            </div>
          </div>

          <FpButton variant="primary" class="final-btn" @click="router.push('/routes')">
            К списку маршрутов
          </FpButton>
        </FpCard>
      </div>
    </Teleport>

    <FpConfirmationModal v-model:visible="showDeleteConfirm" title="Удаление маршрута"
      message="Вы уверены, что хотите безвозвратно удалить этот маршрут?" confirmText="Удалить" variant="danger"
      @confirm="handleDelete" />

    <FpConfirmationModal v-model:visible="showPublishConfirm" title="Публикация"
      message="Отправить маршрут на модерацию? После этого вы не сможете его редактировать до проверки."
      confirmText="Отправить" @confirm="handlePublish" />

    <!-- Report Modal -->
    <FpConfirmationModal v-model:visible="showReportModal" title="Пожаловаться на маршрут"
      message="Опишите, что не так с этим маршрутом (ошибки, спам, неприемлемый контент)" confirmText="Отправить"
      variant="danger" :confirmDisabled="!reportReason.trim() || isReporting" @confirm="handleReport">
      <div style="margin-top: 16px;">
        <FpInput v-model="reportReason" placeholder="Причина жалобы..." autofocus />
      </div>
    </FpConfirmationModal>

    <!-- Exit Confirmation Modal -->
    <FpConfirmationModal
      v-model:visible="showExitConfirm"
      title="Завершить маршрут?"
      message="Весь текущий прогресс (время и пройденные точки) будет сброшен."
      confirmText="Выйти"
      cancelText="Отмена"
      variant="danger"
      @confirm="handleConfirmExit"
    />
  </div>
</template>

<style scoped lang="scss">
.route-detail-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: calc(160px + env(safe-area-inset-bottom));

  &.active-mode {
    padding-bottom: calc(240px + env(safe-area-inset-bottom));
  }
}

.route-detail-content {
  height: 100%;
}

.route-hero {
  height: 280px;
  position: relative;
  background: var(--color-surface);
  will-change: transform, opacity;
  z-index: 1;

  .hero-image-wrap {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.3s ease-out;
    }

    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom,
          rgba(0, 0, 0, 0.4) 0%,
          transparent 30%,
          transparent 70%,
          rgba(0, 0, 0, 0.6) 100%);
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

.route-info-section {
  padding: 0 20px 24px;
  position: relative;
  z-index: 2;
  margin-top: -20px;
  background: var(--color-background);
  border-radius: 24px 24px 0 0;
}

.sticky-header-wrapper {
  position: sticky;
  top: 0;
  z-index: 100;
  margin: 0 -20px;
  padding: 24px 20px 8px;
  background: var(--color-background);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 24px 24px 0 0;

  &.is-stuck {
    padding-top: calc(12px + env(safe-area-inset-top));
    padding-bottom: 12px;
    background: var(--color-surface-glass);
    backdrop-filter: blur(20px);
    border-bottom: 1px solid var(--color-border);
    border-radius: 0;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);

    .route-hero-meta {
      margin-bottom: 8px;

      .meta-top,
      .author-meta-row {
        height: 0;
        margin: 0;
        opacity: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .route-title {
        font-size: 20px;
        margin: 0;
        text-align: center;
      }
    }

    .social-summary-bar {
      margin-bottom: 0;
      background: none;
      border: none;
      padding: 0;

      .social-action {
        flex-direction: row;
        gap: 4px;
        padding: 4px;

        span {
          display: none; // Скрываем текст в липком режиме для компактности
        }

        svg {
          width: 20px;
          height: 20px;
        }
      }
    }
  }

  .stuck-back-btn {
    position: absolute;
    left: 12px;
    top: calc(8px + env(safe-area-inset-top));
    z-index: 10;
  }
}

.route-hero-meta {
  margin-bottom: 24px;

  .meta-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
}

.category-tag {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.status-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 100px;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;

  &.draft {
    background: rgba(255, 255, 255, 0.1);
    color: var(--color-text-secondary);

    .status-dot {
      background: var(--color-text-tertiary);
    }
  }

  &.pending {
    background: rgba(255, 193, 7, 0.15);
    color: #ffc107;

    .status-dot {
      background: #ffc107;
      animation: status-pulse 1.5s infinite;
    }
  }

  &.published {
    background: rgba(var(--color-success-rgb), 0.15);
    color: var(--color-success);

    .status-dot {
      background: var(--color-success);
    }
  }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }
}

@keyframes status-pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.5);
    opacity: 0.5;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.route-title {
  font-size: 28px;
  font-weight: 900;
  color: var(--color-text-primary);
  line-height: 1.2;
  margin: 0 0 12px 0;
  transition: all 0.3s ease;
}

.author-meta-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;

  .author-info-link {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;

    &:active {
      opacity: 0.7;
    }

    .author-avatar-mini {
      width: 24px;
      height: 24px;
      border-radius: 8px;
      background: var(--color-primary);
      color: #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 800;
      background-size: cover;
      background-position: center;
    }

    .author-name {
      font-size: 13px;
      font-weight: 700;
      color: var(--color-primary);
    }
  }

  .meta-divider {
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: var(--color-text-tertiary);
    opacity: 0.3;
  }

  .created-date {
    font-size: 13px;
    color: var(--color-text-tertiary);
    font-weight: 500;
  }
}

.social-summary-bar {
  display: flex;
  justify-content: space-between;
  padding: 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 20px;
  margin-bottom: 24px;
  width: 100%;
  transition: all 0.3s ease;
}

.social-action {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  padding: 8px 0;
  border-radius: 12px;

  &:active {
    transform: scale(0.9);
    background: rgba(255, 255, 255, 0.05);
  }

  span {
    font-size: 11px;
    font-weight: 600;
    // Удален uppercase для более мягкого вида
  }

  &.active {
    color: var(--color-primary);

    svg {
      transform: scale(1.1);
    }
  }

  &.report-action {
    &:active {
      color: var(--color-error);
    }

    svg {
      color: color-mix(in srgb, var(--color-error) 70%, transparent);
    }
  }
}

.detail-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 20px;
  padding: 24px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 32px;
}

.stat {
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: var(--color-primary);
    width: 20px;
    height: 20px;
    flex-shrink: 0;
    opacity: 0.8;
  }

  span {
    font-size: 14px;
    font-weight: 600;
    color: var(--color-text-primary);
    line-height: 1.2;
  }

  .completions-icon {
    color: #FFD700 !important;
    opacity: 1 !important;
  }
}


.active-hud {
  position: absolute;
  top: 50px;
  left: 0;
  right: 0;
  padding: calc(24px + env(safe-area-inset-top)) 16px 16px;
  z-index: 1010;
  pointer-events: none;

  &>* {
    pointer-events: auto;
  }
}

.hud-top-panel {
  margin: 0 12px 12px;
  background: rgba(15, 18, 25, 0.85); // Сделали фон чуть плотнее
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 12px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  gap: 8px;

  .hud-route-header {
    text-align: center;

    .hud-route-name {
      font-size: 0.85rem;
      font-weight: 600;
      color: rgba(255, 255, 255, 0.7);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
    }
  }

  .hud-stats-bar {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 16px;

    .hud-stat-item {
      display: flex;
      align-items: center;
      gap: 6px;

      .stat-icon {
        color: var(--color-primary);
        opacity: 0.8;
      }

      .value {
        font-size: 1.1rem;
        font-weight: 800;
        color: var(--color-white);
        font-variant-numeric: tabular-nums;
      }
    }

    .hud-divider {
      width: 1px;
      height: 16px;
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.target-card-mini {
  margin: 0 12px;
  background: rgba(40, 44, 55, 0.85); // Сделали фон чуть плотнее
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 12px 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);

  .target-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
  }

  .target-info-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .target-label-mini {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.12em;
  }

  .target-title-mini {
    font-weight: 700;
    color: var(--color-white);
    font-size: 1.1rem;
  }

  .target-dist-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(255, 222, 0, 0.12);
    padding: 6px 14px;
    border-radius: 14px;
    border: 1px solid rgba(255, 222, 0, 0.2);

    .dist-icon {
      color: var(--color-primary);
    }

    .dist-value {
      font-weight: 900;
      color: var(--color-primary);
      font-size: 1.1rem;
      font-variant-numeric: tabular-nums;
    }
  }

  .target-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 2px;
  }

  .target-order {
    font-size: 10px;
    font-weight: 800;
    color: var(--color-primary);
    background: rgba(var(--color-primary-rgb), 0.1);
    padding: 2px 6px;
    border-radius: 4px;
    border: 1px solid rgba(var(--color-primary-rgb), 0.2);
  }

  .target-actions-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .info-btn {
    width: 40px;
    height: 40px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.9);
      background: rgba(255, 255, 255, 0.1);
    }
  }
}

.checkpoint-detail-panel {
  position: fixed;
  bottom: calc(30px + env(safe-area-inset-bottom));
  left: 16px;
  right: 16px;
  width: auto;
  background: var(--color-surface-glass);
  backdrop-filter: blur(30px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 24px;
  padding: 20px 20px calc(20px + env(safe-area-inset-bottom));
  z-index: 3000;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
  pointer-events: auto;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  transition: transform 0.1s ease-out;

  &.floating-panel {
    // Стиль парящей панели
  }

  .panel-handle {
    width: 40px;
    height: 4px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
    margin: -8px auto 16px;
    flex-shrink: 0;
  }

  .panel-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    flex-shrink: 0;
  }

  .panel-content-scroll {
    overflow-y: auto;
    flex: 1;
    margin-bottom: 20px;
    padding-right: 4px;

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 10px;
    }
  }

  .checkpoint-media {
    margin-bottom: 20px;

    .media-row {
      display: flex;
      gap: 12px;
      overflow-x: auto;
      padding-bottom: 8px;

      &::-webkit-scrollbar {
        height: 4px;
      }

      &::-webkit-scrollbar-thumb {
        background: rgba(255, 255, 255, 0.1);
        border-radius: 10px;
      }
    }

    .checkpoint-img {
      width: 240px;
      height: 160px;
      object-fit: cover;
      border-radius: 16px;
      flex-shrink: 0;
      background: rgba(255, 255, 255, 0.05);

      &.single {
        width: 100%;
        height: 200px;
      }
    }
  }

  .point-badge {
    background: var(--color-primary);
    color: #000;
    font-size: 10px;
    font-weight: 800;
    padding: 4px 12px;
    border-radius: 100px;
    text-transform: uppercase;
  }

  .qr-mini-btn {
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: var(--color-primary);
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.9);
      background: rgba(var(--color-primary-rgb), 0.2);
    }
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .close-panel {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--color-text-tertiary);
    background: rgba(255, 255, 255, 0.1);
    border: none;
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.9);
      background: rgba(255, 255, 255, 0.2);
      color: var(--color-white);
    }
  }

  .panel-title {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 12px;
  }

  .panel-desc {
    font-size: 0.95rem;
    line-height: 1.6;
    color: var(--color-text-secondary);
    margin: 0 0 24px;
    max-height: 180px;
    overflow-y: auto;
  }

  .panel-footer {
    display: flex;
    justify-content: center;

    button {
      width: 100%;
      height: 48px;
    }
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}

.map-section {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-background);
  margin-bottom: 24px;
  padding: 12px 0 20px;
  border-bottom: 1px solid var(--color-border);

  h2 {
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 12px;
    color: var(--color-text-tertiary);
  }
}

.route-map {
  height: 40vh;
  min-height: 240px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
  transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);

  &.full-screen {
    position: fixed;
    inset: 0;
    top: 64px;
    bottom: 84px;
    height: auto;
    width: 100%;
    border-radius: 0;
    border: none;
    z-index: 50;
    pointer-events: auto; // РАЗРЕШАЕМ КЛИКИ ПО КАРТЕ
  }
}

.active-map-section {
  position: fixed;
  inset: 0;
  z-index: 50;
  pointer-events: auto; // РАЗРЕШАЕМ КЛИКИ НА УРОВНЕ СЕКЦИИ
}


.active-actions-bottom {
  position: absolute;
  bottom: calc(30px + env(safe-area-inset-bottom));
  left: 16px;
  right: 16px;
  display: flex;
  gap: 12px;
  z-index: 2100; // ПОВЫШАЕМ
  pointer-events: auto;

  .exit-action-btn,
  .ar-action-btn,
  .target-action-btn {
    height: 60px;
    border-radius: 18px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    transition: all 0.2s ease;

    &:active {
      transform: scale(0.95);
    }
  }

  .exit-action-btn {
    flex: 1;
    background: rgba(45, 48, 60, 0.9) !important;
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff !important;
  }

  .ar-action-btn {
    flex: 1.2;
    background: linear-gradient(135deg, #FFDE00, #FFC000) !important;
    color: #000 !important;
    border: none;
  }

  .target-action-btn {
    flex: 1.5;
    background: linear-gradient(135deg, #FFDE00, #FFC000) !important;
    color: #000 !important;
    border: none;

    &:disabled {
      background: #333 !important;
      color: #666 !important;
      box-shadow: none;
      opacity: 0.5;
    }
  }
}

.checkpoints-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checkpoint-item {
  display: flex;
  gap: 12px;
  padding: 16px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);

  &.completed {
    border-color: var(--color-success);
    background: rgba(var(--color-success-rgb), 0.05);
  }

  &.next {
    border-color: var(--color-primary);
    border-width: 2px;
  }
}

.checkpoint-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.bottom-action {
  position: fixed;
  bottom: 80px;
  left: 20px;
  right: 20px;
  z-index: 1000;
}

.start-btn {
  width: 100%;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-weight: 800;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: .5rem;
}

.active-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.stop-btn {
  flex: 0.3;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  font-weight: 700;
  border: 1px solid var(--color-border);
}

.check-btn {
  flex: 1;
  padding: 16px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: white;
  font-weight: 800;
  border: none;
}

.btn-seek-ar {
  flex: 1;
  padding: 16px;
  border: 2px solid var(--color-primary);
  border-radius: var(--radius-md);
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.victory-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 24px;
}

.victory-modal {
  width: 100%;
  max-width: 360px;
  padding: 32px 24px;
  text-align: center;
  border: 2px solid var(--color-primary);

  .victory-header h2 {
    font-size: 24px;
    font-weight: 900;
    margin: 16px 0 8px;
  }
}

.victory-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 24px 0;
}

.artifact-reward {
  margin: 24px 0;

  .reward-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);

    img {
      width: 56px;
      height: 56px;
    }
  }
}

.loader,
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

.navigation-layer {
  position: fixed;
  inset: 0;
  background: var(--color-background);
  z-index: 5000;
  overflow: hidden; // КРИТИЧНО: запрещаем общий скролл
  display: flex;
  flex-direction: column;
}

.active-hud {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 2100; // ПОВЫШАЕМ
  pointer-events: none; // Чтобы можно было кликнуть на карту сквозь пустые места

  &>* {
    pointer-events: auto; // Но на сами плашки нажимать можно
  }
}

.hud-top-panel {
  padding: calc(20px + env(safe-area-inset-top)) 20px 20px;
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8) 0%, transparent 100%);
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }

  100% {
    opacity: 1;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 24px;
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.qr-modal-container {
  width: 90%;
  max-width: 340px;
  animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.qr-card {
  text-align: center;
  padding: 32px 24px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 28px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
}

.qr-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;

  h3 {
    margin: 0;
    font-size: 18px;
  }
}

.close-qr {
  background: none;
  border: none;
  color: var(--color-text-secondary);
  padding: 4px;
}

.qr-image-wrap {
  background: #FFFFFF;
  padding: 16px;
  border-radius: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  border: 1px solid rgba(0, 0, 0, 0.05);

  img {
    display: block;
    width: 220px;
    height: 220px;
    object-fit: contain;
    // Гарантируем, что картинка не прозрачная
    background: white;
  }
}

.qr-hint {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.4;
  margin-bottom: 24px;
}

.qr-done-btn {
  width: 100%;
}


.publish-block {
  margin: 32px 0;

  .publish-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    gap: 16px;

    .publish-icon-wrap {
      width: 56px;
      height: 56px;
      border-radius: 18px;
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 4px;
    }

    .publish-text {
      h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 800;
        color: var(--color-text-primary);
      }

      p {
        margin: 0;
        font-size: 14px;
        color: var(--color-text-tertiary);
        line-height: 1.5;
      }
    }

    button {
      width: 100%;
      margin-top: 8px;
    }
  }
}
</style>
