<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { FpSpinner, FpBackButton, FpConfirmationModal, FpPullToRefresh, FpButton, FpCard } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { useSocialStore } from '@/modules/social/state/useSocialStore'
import { MuseumService } from '@/modules/profile/services/MuseumService'
import { authStore } from '@/modules/auth/store/authStore'
import ArOverlay from '@/modules/ar/ui/ArOverlay.vue'
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
  Tag
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
  return currentCheckpoints.value.map(cp => ({
    id: cp.id,
    lat: cp.latitude,
    lng: cp.longitude,
    title: cp.title,
    order: cp.order
  }))
})

// Active Tracking State
const userLocation = ref<[number, number] | null>(null)
const completedCheckpointIds = ref(new Set<string>())
const elapsedTime = ref('00:00')
let timerInterval: any = null
let locationInterval: any = null

const nextCheckpoint = computed(() => {
  return [...currentCheckpoints.value]
    .sort((a, b) => a.order - b.order)
    .find(cp => !completedCheckpointIds.value.has(cp.id))
})

const nextCheckpointLocation = computed<[number, number] | null>(() => {
  if (!nextCheckpoint.value) return null
  return [nextCheckpoint.value.latitude, nextCheckpoint.value.longitude]
})

const distanceToNext = computed(() => {
  if (!userLocation.value || !nextCheckpointLocation.value) return Infinity
  return calculateDistance(
    userLocation.value[0], userLocation.value[1],
    nextCheckpointLocation.value[0], nextCheckpointLocation.value[1]
  )
})

const isNearNext = computed(() => distanceToNext.value < 50) // 50 meters

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3
  const φ1 = lat1 * Math.PI/180
  const φ2 = lat2 * Math.PI/180
  const Δφ = (lat2-lat1) * Math.PI/180
  const Δλ = (lon2-lon1) * Math.PI/180
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
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

    // GPS SIMULATION FOR TESTING (v2.12.0 Stability Patch)
    setTimeout(() => {
      console.log('[GPS Mock] Adjusting location to trigger navigation...')
      if (currentCheckpoints.value.length > 0) {
        const first = currentCheckpoints.value[0]
        userLocation.value = [first.latitude - 0.001, first.longitude - 0.001]
      }
    }, 3000)
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
onMounted(() => {
  fetchRouteDetails()
  
  // Timer mock
  let seconds = 0
  timerInterval = setInterval(() => {
    if (isActiveMode.value) {
      seconds++
      const m = Math.floor(seconds / 60).toString().padStart(2, '0')
      const s = (seconds % 60).toString().padStart(2, '0')
      elapsedTime.value = `${m}:${s}`
    }
  }, 1000)

  // Location mock
  locationInterval = setInterval(() => {
    if (isActiveMode.value && !userLocation.value) {
      // Set initial mock location near first point
      if (currentCheckpoints.value[0]) {
        userLocation.value = [
          currentCheckpoints.value[0].latitude + 0.0001,
          currentCheckpoints.value[0].longitude + 0.0001
        ]
      }
    }
  }, 3000)
})

onUnmounted(() => {
  clearInterval(timerInterval)
  clearInterval(locationInterval)
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
        <!-- Active HUD Overlay -->
        <transition name="fade-slide">
          <div v-if="isActiveMode" class="active-hud">
            <div class="hud-top">
              <div class="hud-stat">
                <span class="label">Точка</span>
                <span class="value">{{ completedCheckpointIds.size + 1 }} / {{ currentCheckpoints.length }}</span>
              </div>
              
              <div class="hud-controls">
                <button class="hud-btn active">
                  <Navigation :size="18" />
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
                   {{ formatDistance(distanceToNext) }}
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
                <textarea 
                  v-model="commentText" 
                  placeholder="Поделитесь впечатлениями..." 
                  rows="2"
                  class="comment-textarea"
                ></textarea>
                <FpButton 
                  variant="primary" 
                  size="sm" 
                  class="send-comment-btn"
                  :disabled="!commentText.trim() || isSubmittingComment"
                  @click="handleSubmitComment"
                >
                  <Send :size="18" />
                </FpButton>
              </div>

              <transition name="fade-slide">
                <div class="comments-list">
                  <div v-for="comment in comments" :key="comment.id" class="comment-card">
                    <div class="comment-user">
                      <div class="user-avatar" :style="comment.avatarUrl ? `background-image: url(${comment.avatarUrl})` : ''">
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
                </div>
                <div v-if="completedCheckpointIds.has(cp.id)" class="check-icon">✅</div>
              </div>
            </div>
          </div>
        </div>
      </FpPullToRefresh>

      <div class="bottom-action">
        <template v-if="!isActiveMode">
          <button class="start-btn" @click="isActiveMode = true">
            <Navigation :size="20" /> Начать маршрут
          </button>
        </template>
        <template v-else>
          <div class="active-actions">
            <button class="stop-btn" @click="isActiveMode = false">Выход</button>
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
                До точки: {{ formatDistance(distanceToNext) }}
              </span>
              <span v-else>Забрать</span>
            </button>
          </div>
        </template>
      </div>
    </div>

    <!-- Modals & Overlays -->
    <ArOverlay 
      v-if="isArMode" 
      @capture="onArtifactCapture" 
      @close="stopArSession"
    />

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
    img { width: 100%; height: 100%; object-fit: cover; }
    .hero-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 40%, rgba(0,0,0,0.4) 100%);
    }
  }

  .hero-placeholder {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    color: var(--color-text-tertiary);
  }

  .hero-header {
    position: absolute; top: 12px; left: 12px; right: 12px; z-index: 10;
    display: flex; justify-content: space-between; align-items: center;
  }
}

.route-info-section {
  padding: 24px 20px;
}

.route-title {
  font-size: 24px; font-weight: 800; color: var(--color-text-primary); margin: 0 0 16px;
}

.social-summary-bar {
  display: flex; justify-content: space-around; padding: 16px 0;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: 24px;
}

.social-action {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  color: var(--color-text-secondary); cursor: pointer;
  span { font-size: 11px; font-weight: 700; text-transform: uppercase; }
  &.active { color: var(--color-primary); }
}

.detail-stats {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
  margin: 16px 0; padding: 16px 0; border-top: 1px solid var(--color-border);
}

.stat {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 700; color: var(--color-text-secondary);
  svg { color: var(--color-primary); }
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
    h2 { font-size: 20px; font-weight: 800; margin: 0; }
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
    &::placeholder { color: var(--color-text-tertiary); }
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
      .user-name { font-weight: 700; font-size: 14px; color: var(--color-text-primary); }
      .comment-date { font-size: 11px; color: var(--color-text-tertiary); }
    }
  }

  .comment-content {
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
  }
}

.active-hud {
  position: fixed; top: 64px; left: 0; right: 0; z-index: 1010;
  padding: 12px 16px 20px;
  pointer-events: none; // Allow clicks through to map except for buttons
  & > * { pointer-events: auto; }
}

.hud-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(var(--color-surface-rgb), 0.85);
  backdrop-filter: blur(12px);
  padding: 12px 20px;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 12px;

  .hud-stat, .hud-timer {
    display: flex;
    align-items: center;
    gap: 8px;
    
    .label {
      font-size: 11px;
      text-transform: uppercase;
      color: var(--color-text-tertiary);
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    
    .value {
      font-size: 14px;
      font-weight: 800;
      color: var(--color-primary);
    }
  }
}

.target-card {
  background: rgba(var(--color-surface-rgb), 0.85);
  backdrop-filter: blur(12px);
  border-radius: var(--radius-lg);
  padding: 16px 20px;
  box-shadow: var(--shadow-3);
  border: 1px solid var(--color-primary);
  
  .target-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .target-badge {
      font-size: 11px;
      background: rgba(var(--color-primary-rgb), 0.1);
      color: var(--color-primary);
      padding: 4px 10px;
      border-radius: var(--radius-sm);
      font-weight: 700;
    }
    
    .target-distance {
      font-size: 14px;
      font-weight: 800;
      &.near { color: var(--color-success); animation: pulse 1s infinite; }
    }
  }
  
  h3 { font-size: 18px; font-weight: 800; margin: 0 0 4px; }
  p { font-size: 13px; color: var(--color-text-secondary); margin: 0; line-height: 1.4; }
}

.map-section { margin-top: 24px; h2 { font-size: 20px; font-weight: 800; margin-bottom: 16px; } }
.inline-map { height: 200px; border-radius: var(--radius-md); overflow: hidden; border: 1px solid var(--color-border); }

.checkpoints-list { display: flex; flex-direction: column; gap: 12px; }
.checkpoint-item {
  display: flex; gap: 12px; padding: 16px; background: var(--color-surface);
  border-radius: var(--radius-md); border: 1px solid var(--color-border);
  &.completed { border-color: var(--color-success); background: rgba(var(--color-success-rgb), 0.05); }
  &.next { border-color: var(--color-primary); border-width: 2px; }
}

.checkpoint-number {
  width: 28px; height: 28px; border-radius: 50%; background: var(--color-primary);
  color: white; display: flex; align-items: center; justify-content: center; font-weight: 800; flex-shrink: 0;
}

.bottom-action { position: fixed; bottom: 80px; left: 20px; right: 20px; z-index: 1000; }
.start-btn { width: 100%; padding: 16px; border-radius: var(--radius-md); background: var(--color-primary); color: white; font-weight: 800; border: none; }
.active-actions { display: flex; gap: 12px; width: 100%; }
.stop-btn { flex: 0.3; padding: 16px; border-radius: var(--radius-md); background: var(--color-surface); font-weight: 700; border: 1px solid var(--color-border); }
.check-btn { flex: 1; padding: 16px; border-radius: var(--radius-md); background: var(--color-primary); color: white; font-weight: 800; border: none; }
.btn-seek-ar { flex: 1; padding: 16px; border: 2px solid var(--color-primary); border-radius: var(--radius-md); background: rgba(var(--color-primary-rgb), 0.1); color: var(--color-primary); font-weight: 800; display: flex; align-items: center; justify-content: center; gap: 8px; }

.victory-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px);
  display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 24px;
}
.victory-modal {
  width: 100%; max-width: 360px; padding: 32px 24px; text-align: center; border: 2px solid var(--color-primary);
  .victory-header h2 { font-size: 24px; font-weight: 900; margin: 16px 0 8px; }
}
.victory-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 24px 0; }
.artifact-reward { margin: 24px 0; .reward-card { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 12px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); img { width: 56px; height: 56px; } } }

.loader, .error-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; }

@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
</style>
