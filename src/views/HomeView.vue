<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '@/modules/auth/services/AuthService'
import { FpPullToRefresh, FpCard, FpButton } from '@/design-system'
import { Users, Navigation, ChevronRight, X, Lightbulb, Map as MapIcon } from 'lucide-vue-next'
import { useRoutesStore } from '@/modules/routes/state/useRoutesStore'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { LocationService } from '@/shared/lib/LocationService'
import type { Route } from '@/modules/routes/types'

const router = useRouter()

// User Profile
const userProfile = ref<{ first_name: string | null; display_name: string | null } | null>(null)
const userName = computed(() => userProfile.value?.display_name || userProfile.value?.first_name || 'друг')

// Welcome Greeting
const greeting = computed(() => {
  const hour = new Date().getHours()
  if (hour < 6) return 'Доброй ночи'
  if (hour < 12) return 'Доброе утро'
  if (hour < 18) return 'Добрый день'
  return 'Добрый вечер'
})

// Tip of the Day
const tips = [
  'Исследуй новые места, чтобы повысить свой уровень и открыть редкие артефакты!',
  'Не забывай брать с собой воду и пауэрбанк в долгие городские маршруты.',
  'Создавай свои маршруты в редакторе и делись ими — лучшие попадают в топ!',
  'Находи артефакты, чтобы пополнить свою коллекцию в Музее и получить бонусы.',
  'Используй режим компаса на карте, чтобы она всегда вращалась по твоему курсу.',
  'Кликни на кластер на карте, чтобы увидеть все маршруты в этой области.',
  'Твой прогресс сохраняется автоматически — исследуй мир в своем темпе!'
]

const dailyTip = computed(() => {
  const level = userStats.value?.level || 1
  
  const noviceTips = [
    'Исследуй новые места, чтобы повысить свой уровень и открыть редкие артефакты!',
    'Кликни на иконку маршрута на карте, чтобы увидеть количество точек в нем.',
    'Твой прогресс сохраняется автоматически — исследуй мир в своем темпе!',
    'Находи артефакты, чтобы пополнить свою коллекцию в Музее и получить бонусы.'
  ]
  
  const proTips = [
    'Создавай свои маршруты в редакторе и делись ими — лучшие попадают в топ!',
    'Используй режим компаса на карте, чтобы она всегда вращалась по твоему курсу.',
    'Кликни на кластер на карте, чтобы увидеть все маршруты в этой области.',
    'Стань мастером региона, создав 5 популярных маршрутов в своем городе!'
  ]

  const relevantTips = level < 5 ? noviceTips : proTips
  const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000)
  return relevantTips[dayOfYear % relevantTips.length]
})

// Location & Nearest Route
const userLocation = ref<{ lat: number; lng: number } | null>(null)

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * (Math.PI / 180)
  const dLon = (lon2 - lon1) * (Math.PI / 180)
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return R * c
}

const nearestRoute = computed(() => {
  if (!userLocation.value || !routes.value.length) return null
  
  const routesWithDistance = routes.value
    .filter(r => r.startLat && r.startLng)
    .map(r => ({
      ...r,
      distance: calculateDistance(
        userLocation.value!.lat,
        userLocation.value!.lng,
        r.startLat!,
        r.startLng!
      )
    }))
    .sort((a, b) => a.distance - b.distance)
    
  return routesWithDistance[0] || null
})

// Personalized Data
const userStats = ref<any>(null)
const isLoading = ref(true)

const { routes, fetchRoutes } = useRoutesStore()
const selectedRoute = ref<Route | null>(null)

const routePoints = computed(() => {
  return routes.value
    .filter(r => r.startLat != null && r.startLng != null)
    .map(r => ({
      id: r.id,
      lat: r.startLat!,
      lng: r.startLng!,
      title: r.title,
      imageUrl: r.imageUrl,
      category: r.category,
      checkpointsCount: r.checkpointsCount
    }))
})

const handleMarkerClick = (id: string) => {
  const r = routes.value.find(route => route.id === id)
  if (r) selectedRoute.value = r
}

const loadData = async () => {
  isLoading.value = true
  try {
    const [stats, profile, loc] = await Promise.all([
      AuthService.getUserStats(),
      AuthService.getProfile(),
      LocationService.getCurrentPosition().catch(() => null),
      fetchRoutes()
    ])
    userStats.value = stats
    userProfile.value = profile
    if (loc) {
      userLocation.value = { lat: loc.latitude, lng: loc.longitude }
    }
  } catch (e) {
    console.error('Failed to load home data', e)
  } finally {
    isLoading.value = false
  }
}

const handleRefresh = async (done: () => void) => {
  await loadData()
  done()
}

onMounted(loadData)
</script>

<template>
  <div class="home-dashboard">
    <FpPullToRefresh @refresh="handleRefresh">
      <!-- Dashboard Hero: Personalized Profile -->
      <header class="dashboard-hero">
        <div class="page-title-row">
          <div class="title-group">
            <h1 class="page-title">{{ greeting }}, <span class="accent">{{ userName }}</span></h1>
            <p class="page-subtitle">Твой прогресс в Artifactum</p>
          </div>
        </div>

        <FpCard class="tip-of-the-day" padding="md">
          <div class="tip-icon">
            <Lightbulb :size="24" />
          </div>
          <div class="tip-content">
            <span class="tip-label">Совет дня</span>
            <p class="tip-text">{{ dailyTip }}</p>
          </div>
        </FpCard>
      </header>

      <div class="dashboard-content">
        <!-- Artifactum Routes Section -->
        <section class="routes-highlight">
          <div class="section-header">
            <h2 class="section-title">Маршруты и квесты 🗺️</h2>
            <FpButton variant="text" size="sm" @click="router.push('/routes')">Все</FpButton>
          </div>

          <FpCard class="promo-card route-card" @click="router.push('/routes')">
            <div class="promo-content">
              <div class="promo-text">
                <h3>Начни свое приключение</h3>
                <p>Исследуй город, находи скрытые точки и получай артефакты.</p>
              </div>
              <div class="promo-icon">
                <Navigation :size="48" />
              </div>
            </div>
          </FpCard>

          <FpCard class="promo-card team-card" @click="router.push('/teams')">
            <div class="promo-content">
              <div class="promo-text">
                <h3>Твои команды</h3>
                <p>Проходи маршруты вместе с друзьями и соревнуйся с другими.</p>
              </div>
              <div class="promo-icon">
                <Users :size="48" />
              </div>
            </div>
          </FpCard>
        </section>

        <!-- Global Routes Map -->
        <section class="global-map-section">
          <div class="section-header">
            <h2 class="section-title">Карта приключений 🗺️</h2>
          </div>
          
          <div class="map-wrapper">
            <ArtMap 
              class="home-map"
              :points="routePoints"
              :is-clustered="true"
              @marker-click="handleMarkerClick"
              @map-click="selectedRoute = null"
            />
            
            <transition name="slide-up">
              <div v-if="selectedRoute" class="route-mini-popup">
                <div class="popup-content">
                  <div class="route-thumb" :style="selectedRoute.imageUrl ? `background-image: url(${selectedRoute.imageUrl})` : ''">
                    <Navigation v-if="!selectedRoute.imageUrl" :size="24" />
                  </div>
                  <div class="route-info">
                    <h4>{{ selectedRoute.title }}</h4>
                    <p>{{ selectedRoute.category }} • {{ selectedRoute.checkpointsCount }} точек</p>
                  </div>
                  <div class="popup-actions">
                    <FpButton variant="primary" size="sm" @click="router.push(`/route/${selectedRoute.id}`)">
                      <ChevronRight :size="18" />
                    </FpButton>
                  </div>
                  <button class="close-popup" @click="selectedRoute = null">
                    <X :size="18" />
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </section>

        <!-- Placeholder for active quest if exists -->
        <section v-if="userStats?.activeRoute" class="active-quest">
          <div class="section-header">
            <h2 class="section-title">Текущий квест 🏃</h2>
          </div>
          <FpCard class="active-card" @click="router.push(`/route/${userStats.activeRoute.id}`)">
            <div class="active-info">
              <h4>{{ userStats.activeRoute.title }}</h4>
              <p>Выполнено {{ userStats.activeRoute.completedCount }} из {{ userStats.activeRoute.totalCount }} точек
              </p>
            </div>
            <div class="active-arrow">→</div>
          </FpCard>
        </section>

        <!-- Nearest Route -->
        <section v-if="nearestRoute" class="nearest-route-section">
          <div class="section-header">
            <h2 class="section-title">Поблизости 📍</h2>
          </div>
          <FpCard class="nearest-card" @click="router.push(`/route/${nearestRoute.id}`)">
             <div class="route-icon">
                <MapIcon :size="24" />
             </div>
             <div class="route-details">
                <div class="route-meta">
                  <span class="distance">~{{ nearestRoute.distance.toFixed(1) }} км от тебя</span>
                </div>
                <h3>{{ nearestRoute.title }}</h3>
                <p>{{ nearestRoute.checkpointsCount }} точек • {{ nearestRoute.category || 'Маршрут' }}</p>
             </div>
             <div class="action-arrow">
                <ChevronRight :size="20" />
             </div>
          </FpCard>
        </section>
      </div>
    </FpPullToRefresh>
  </div>
</template>

<style scoped lang="scss">
.home-dashboard {
  min-height: 100vh;
  background: var(--color-background);
}

.dashboard-hero {
  padding-top: var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: 20px;

  .accent {
    color: var(--color-primary);
  }

  .tip-of-the-day {
    display: flex;
    gap: 16px;
    align-items: center;
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, var(--color-surface)), var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    border-radius: 18px;
    padding: 16px;
    margin-top: 12px;

    .tip-icon {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      color: var(--color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .tip-content {
      display: flex;
      flex-direction: column;
      gap: 2px;

      .tip-label {
        font-size: 11px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-primary);
      }

      .tip-text {
        font-size: 14px;
        line-height: 1.4;
        color: var(--color-text-secondary);
        margin: 0;
      }
    }
  }
}

.nearest-route-section {
  display: flex;
  flex-direction: column;
  gap: 12px;

  .nearest-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 20px;
    cursor: pointer;
    transition: transform 0.2s;

    &:active {
      transform: scale(0.98);
    }

    .route-icon {
      width: 48px;
      height: 48px;
      background: color-mix(in srgb, var(--color-secondary) 15%, transparent);
      color: var(--color-secondary);
      border-radius: 14px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .route-details {
      flex: 1;
      min-width: 0;

      .route-meta {
        margin-bottom: 2px;
        .distance {
          font-size: 11px;
          font-weight: 800;
          color: var(--color-secondary);
          text-transform: uppercase;
        }
      }

      h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        color: var(--color-text-primary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      p {
        margin: 2px 0 0;
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }

    .action-arrow {
      color: var(--color-text-tertiary);
    }
  }
}


.dashboard-content {
  padding: 0 0 40px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.routes-highlight {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .section-title {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
}

.promo-card {
  padding: 20px;
  cursor: pointer;
  border: none;
  overflow: hidden;
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -20px;
    right: -20px;
    width: 120px;
    height: 120px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 50%;
  }

  &.route-card {
    background: linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-variant) 100%);
    color: var(--color-on-primary);
  }

  &.team-card {
    background: linear-gradient(135deg, var(--color-secondary) 0%, var(--color-secondary-variant) 100%);
    color: var(--color-on-primary);
  }

  h3 {
    font-size: 18px;
    font-weight: 800;
    margin: 0 0 6px;
    color: inherit;
  }

  p {
    font-size: 13px;
    margin: 0;
    opacity: 0.9;
    color: inherit;
  }
}

.promo-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.promo-icon {
  opacity: 0.8;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
}

.active-card {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-primary);
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;

  h4 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: var(--color-text-secondary);
  }

  .active-arrow {
    font-size: 20px;
    color: var(--color-primary);
    font-weight: 800;
  }
}

.global-map-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.map-wrapper {
  position: relative;
  height: 350px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-md);
}

.home-map {
  width: 100%;
  height: 100%;
}

.route-mini-popup {
  position: absolute;
  bottom: 16px;
  left: 16px;
  right: 16px;
  z-index: 10000;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  padding: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  border: 1px solid var(--color-border);
  backdrop-filter: blur(10px);
  animation: slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  .popup-content {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
  }

  .route-thumb {
    width: 48px;
    height: 48px;
    border-radius: 8px;
    background: var(--color-background);
    background-size: cover;
    background-position: center;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .route-info {
    flex: 1;
    min-width: 0;
    
    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    p {
      margin: 2px 0 0;
      font-size: 11px;
      color: var(--color-text-tertiary);
    }
  }

  .close-popup {
    position: absolute;
    top: -8px;
    right: -8px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-secondary);
    box-shadow: var(--shadow-sm);
  }
}

@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.slide-up-enter-active, .slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from, .slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
```
