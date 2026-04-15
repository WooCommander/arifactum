<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { FpSpinner, FpBackButton, FpConfirmationModal, FpPullToRefresh, FpButton, FpCard } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { useSocialStore } from '@/modules/social/state/useSocialStore'
import { MuseumService } from '@/modules/profile/services/MuseumService'
import { authStore } from '@/modules/auth/store/authStore'
import ArOverlay from '@/modules/ar/ui/ArOverlay.vue'
import { LocationService, type LocationCoords } from '@/shared/lib/LocationService'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
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
  MessageSquare,
  Send,
  Trophy,
  Tag,
  X
} from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const routesStore = useRoutesStore()
const socialStore = useSocialStore()

const routeId = route.params.id as string
const showDeleteConfirm = ref(false)
const showPublishConfirm = ref(false)
const showVictoryModal = ref(false)
const unlockedArtifact = ref<any>(null)
const routeStats = ref<any>(null)

// Регистрируем глобальный обработчик для гарантированной связи
;(window as any).artSelectCheckpoint = (id: string) => {
  handleMarkerClick(id)
}

// AR State
const isArMode = ref(false)

// Social state
const isLiked = ref(false)
const isFavorite = ref(false)
const commentText = ref('')
const isSubmittingComment = ref(false)

const { currentRoute, currentCheckpoints, isLoading, error } = routesStore
const { comments } = socialStore
const isActiveMode = ref(false)
const isAuthor = computed(() => currentRoute.value?.authorId === authStore.currentUserId.value)
const isDraft = computed(() => currentRoute.value?.status === 'draft')

const mapPoints = computed(() => {
  const points = currentCheckpoints.value.map(cp => ({
    id: cp.id,
    lat: cp.latitude,
    lng: cp.longitude,
    title: cp.title,
    order: cp.order,
    isCompleted: completedCheckpointIds.value.has(cp.id),
    isActive: nextCheckpoint.value?.id === cp.id
  }))
  return points
})

// Active Tracking State
const userLocation = ref<LocationCoords | null>(null)
const completedCheckpointIds = ref(new Set<string>())
const elapsedTime = ref('00:00')
let timerInterval: any = null
let locationWatchId: string | null = null
const selectedCheckpoint = ref<any | null>(null)
const isFollowMode = ref(true)
const isCompassMode = ref(false)

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

async function handleMarkerClick(id: any) {
  const targetId = String(id).trim()
  const cp = currentCheckpoints.value.find(p => String(p.id).trim() === targetId)
  
  if (cp) {
    selectedCheckpoint.value = cp
    // Вибрация отдельно, не блокируя UI
    Haptics.impact({ style: ImpactStyle.Light }).catch(() => {})
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
    await socialStore.fetchComments(routeId)

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

function handleShare() {
  if (navigator.share) {
    navigator.share({
      title: currentRoute.value?.title,
      text: currentRoute.value?.description,
      url: window.location.href
    })
  }
}

async function handleSubmitComment() {
  if (!commentText.value.trim() || !authStore.currentUserId.value) return
  isSubmittingComment.value = true
  try {
    await socialStore.addComment(routeId, authStore.currentUserId.value, commentText.value)
    commentText.value = ''
  } finally {
    isSubmittingComment.value = false
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

async function finishRoute() {
  isActiveMode.value = false
  clearInterval(timerInterval)

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

  // Set stats
  routeStats.value = {
    distanceMeters: Math.round(Math.random() * 5000 + 1000), // Mock
    avgSpeedKmh: (Math.random() * 2 + 4).toFixed(1),
    xpGained: 250,
    levelGained: Math.random() > 0.7
  }

  showVictoryModal.value = true
}

// Lifecycle
onMounted(async () => {
  await fetchRouteDetails()

  // Timer
  let seconds = 0
  timerInterval = setInterval(() => {
    if (isActiveMode.value) {
      seconds++
      const m = Math.floor(seconds / 60).toString().padStart(2, '0')
      const s = (seconds % 60).toString().padStart(2, '0')
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
})

onUnmounted(() => {
  clearInterval(timerInterval)
  if (locationWatchId) {
    LocationService.clearWatch(locationWatchId)
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
      <FpBackButton @click="router.back()" />
    </div>

    <div v-else-if="currentRoute" class="route-detail-content">
      <FpPullToRefresh @refresh="fetchRouteDetails">

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
            {{ currentRoute.status === 'draft' ? 'Черновик' : currentRoute.status === 'pending' ? 'На модерации' :
              'Опубликован' }}
          </div>
        </div>

        <div v-if="!isActiveMode" class="route-info-section">
          <div class="route-hero-meta">
            <div class="category-tag" v-if="currentRoute.category">
              {{ currentRoute.category }}
            </div>
            <h1 class="route-title">{{ currentRoute.title }}</h1>
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
          </div>

          <div class="route-stats">
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

            <!-- Tags -->
            <div class="tags-list" v-if="currentRoute.tags && currentRoute.tags.length">
              <div v-for="tag in currentRoute.tags" :key="tag" class="tag-item">
                <Tag :size="12" />
                <span>{{ tag }}</span>
              </div>
            </div>

            <!-- Comments Section -->
            <div class="comments-section">
              <div class="section-title">
                <MessageSquare :size="20" />
                <h2>Комментарии ({{ comments.length }})</h2>
              </div>

              <div class="comment-input-wrap">
                <textarea v-model="commentText" placeholder="Поделитесь впечатлениями..." rows="2"
                  class="comment-textarea"></textarea>
                <FpButton variant="primary" size="sm" class="send-comment-btn"
                  :disabled="!commentText.trim() || isSubmittingComment" @click="handleSubmitComment">
                  <Send :size="18" />
                </FpButton>
              </div>

              <transition name="fade-slide">
                <div class="comments-list">
                  <div v-for="comment in comments" :key="comment.id" class="comment-card">
                    <div class="comment-user">
                      <div class="user-avatar"
                        :style="comment.avatarUrl ? `background-image: url(${comment.avatarUrl})` : ''">
                        {{ !comment.avatarUrl ? (comment.userName?.[0] || '?') : '' }}
                      </div>
                      <div class="user-info">
                        <span class="user-name">{{ comment.userName }}</span>
                        <span class="comment-date">{{ new Date(comment.createdAt).toLocaleDateString() }}</span>
                      </div>
                    </div>
                    <div class="comment-content">{{ comment.content }}</div>
                  </div>
                </div>
              </transition>
            </div>

            <div v-if="isAuthor && isDraft" class="publish-block">
              <p>Ваш маршрут пока никто не видит кроме вас.</p>
              <button class="publish-btn" @click="showPublishConfirm = true">
                <Send :size="18" /> Опубликовать
              </button>
            </div>
          </div>

          <div v-if="!isActiveMode" class="map-section">
            <h2>Карта маршрута</h2>
            <ArtMap class="route-map" :points="mapPoints" :interactive="true" 
              :user-location="userLocation ? [userLocation.latitude, userLocation.longitude] : null"
              :is-clustered="true" @checkpoint-select="handleMarkerClick" @map-click="selectedCheckpoint = null" />
          </div>

          <div class="section">
            <h2 v-if="!isActiveMode">Маршрутные точки</h2>
            <div v-if="!isActiveMode" class="checkpoints-list">
              <div v-for="cp in currentCheckpoints" :key="cp.id" class="checkpoint-item"
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

          <!-- Карта в активном режиме -->
          <div class="map-section active-map-section">
            <ArtMap class="route-map full-screen" :points="mapPoints" 
              :center="userLocation ? [userLocation.latitude, userLocation.longitude] : undefined"
              :interactive="true" :user-location="userLocation ? [userLocation.latitude, userLocation.longitude] : null" 
              v-model:follow-user="isFollowMode" :is-clustered="false"
              :bearing="isCompassMode ? (userLocation?.heading || 0) : 0"
              :target-location="nextCheckpointLocation" 
              @marker-click="handleMarkerClick" 
              @map-click="selectedCheckpoint = null"
              @toggle-compass="isCompassMode = !isCompassMode" />
          </div>

          <div class="active-actions-bottom">
            <FpButton variant="glass" class="exit-action-btn" @click="isActiveMode = false">
              Выход
            </FpButton>

            <FpButton v-if="isNearNext && !isArMode" variant="primary" class="ar-action-btn"
              @click="startArSession">
              <Navigation :size="20" /> AR
            </FpButton>

            <FpButton variant="primary" class="target-action-btn"
              :disabled="!isNearNext || !nextCheckpoint || isArMode" @click="handleCheckIn">
              {{ isLastPoint ? 'Финиш' : 'Забрать' }}
            </FpButton>
          </div>
        </div>
      </transition>
    </Teleport>

    <!-- Глобальная плашка информации о точке -->
    <Teleport to="body">
      <transition name="slide-up">
        <div v-if="selectedCheckpoint" class="checkpoint-detail-panel floating-panel" 
          :style="{ transform: `translateY(${panelTranslateY}px)` }"
          @touchstart="handleTouchStart"
          @touchmove="handleTouchMove"
          @touchend="handleTouchEnd">
          
          <div class="panel-handle"></div>

          <div class="panel-header">
            <div class="point-badge">Точка #{{ selectedCheckpoint.order }}</div>
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
      background: linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0%, transparent 40%, rgba(0, 0, 0, 0.4) 100%);
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
  padding: 24px 20px;
}

.route-title {
  font-size: 24px;
  font-weight: 800;
  color: var(--color-text-primary);
  margin: 0 0 16px;
}

.social-summary-bar {
  display: flex;
  justify-content: space-around;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.social-action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--color-text-secondary);
  cursor: pointer;

  span {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
  }

  &.active {
    color: var(--color-primary);
  }
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin: 16px 0;
  padding: 16px 0;
  border-top: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);

  svg {
    color: var(--color-primary);
  }
}

.comments-section {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .section-title {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 24px;

    h2 {
      font-size: 20px;
      font-weight: 800;
      margin: 0;
    }
  }
}

.comment-input-wrap {
  display: flex;
  gap: 12px;
  background: rgba(var(--color-surface-rgb), 0.5);
  backdrop-filter: blur(8px);
  padding: 16px;
  border-radius: var(--radius-lg);
  margin-bottom: 32px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  box-shadow: var(--shadow-inner);

  .comment-textarea {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    resize: none;
    font-size: 15px;
    color: var(--color-text-primary);

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--radius-lg);
  padding: 16px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.05);
    transform: translateY(-2px);
  }

  .comment-user {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;

    .user-avatar {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--color-primary);
      background-size: cover;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 800;
      font-size: 14px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }

    .user-info {
      display: flex;
      flex-direction: column;

      .user-name {
        font-weight: 700;
        font-size: 14px;
        color: var(--color-text-primary);
      }

      .comment-date {
        font-size: 11px;
        color: var(--color-text-tertiary);
      }
    }
  }

  .comment-content {
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
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

.route-map {
  height: 200px;
  border-radius: var(--radius-md);
  overflow: hidden;
  border: 1px solid var(--color-border);
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
  z-index: 2000;
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
  
  & > * {
    pointer-events: auto; // Но на сами плашки нажимать можно
  }
}

.hud-top-panel {
  padding: calc(20px + env(safe-area-inset-top)) 20px 20px;
  background: linear-gradient(to bottom, rgba(0,0,0,0.8) 0%, transparent 100%);
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
</style>
