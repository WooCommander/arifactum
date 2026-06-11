<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '@/modules/auth/services/AuthService'
import { FpPullToRefresh, FpCard, FpButton, FpPageHeader } from '@/design-system'
import { Users, Navigation, ChevronRight, X, Lightbulb, Map as MapIcon } from 'lucide-vue-next'
import { teamService } from '@/modules/teams/services/teamService'
import { authStore } from '@/modules/auth/store/authStore'
import { useRoutesStore } from '@/modules/routes/state/useRoutesStore'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { LocationService } from '@/shared/lib/LocationService'
import { getNearestPoint } from '@/shared/lib/geoUtils'
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

const dynamicSubtitle = computed(() => {
  const stats = userStats.value
  const hour = new Date().getHours()

  if (hour >= 23 || hour < 5) return 'Звезды указывают путь к новым тайнам'
  if (!stats) return 'Твой путь в мире Artifactum'

  if (stats.routesCompleted > 0) {
    return `Пройдено ${stats.routesCompleted} маршрутов. Что выберем сегодня?`
  }

  if (stats.xp > 0) {
    return `У тебя уже ${stats.xp} XP! Вперед к новым вершинам`
  }

  return 'Твое приключение начинается здесь'
})

const levelProgress = computed(() => {
  if (!userStats.value) return 0
  const xp = userStats.value.xp || 0
  return (xp % 1000) / 10
})



// Tip of the Day

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

const nearestRoute = computed(() => {
  if (!userLocation.value || !routes.value.length) return null

  const points = routes.value
    .filter(r => r.startLat != null && r.startLng != null)
    .map(r => ({ ...r, lat: r.startLat!, lng: r.startLng! }))

  const nearest = getNearestPoint(points, userLocation.value.lat, userLocation.value.lng)
  if (!nearest) return null

  return { ...nearest, distance: nearest.distanceKm }
})

// Personalized Data
const userStats = ref<any>(null)
const isLoading = ref(true)

const { routes, fetchRoutes } = useRoutesStore()
const userTeams = ref<any[]>([])
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
    const [stats, profile, loc, teams] = await Promise.all([
      AuthService.getUserStats(),
      AuthService.getProfile(),
      LocationService.getCurrentPosition().catch(() => null),
      fetchRoutes(),
      authStore.currentUserId.value ? teamService.getMyTeams() : Promise.resolve([])
    ])
    userStats.value = stats
    userProfile.value = profile
    userTeams.value = Array.isArray(teams) ? teams : []
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
    <FpPullToRefresh @refresh="handleRefresh" class="page-container">
      <!-- Dashboard Hero: Personalized Profile -->
      <header class="dashboard-hero">
        <FpPageHeader>
          <template #title>
            {{ greeting }}, <span class="accent">{{ userName }}</span>
          </template>
          <template #subtitle>
            <div class="header-subtitle-area">
              <span class="subtitle-text">{{ dynamicSubtitle }}</span>
              <div class="xp-status-row" v-if="userStats">
                <div class="lvl-tag">
                  <span class="label">LVL</span>
                  <span class="value">{{ userStats.level }}</span>
                </div>
                <div class="xp-bar-wrapper">
                  <div class="xp-bar-track">
                    <div class="xp-bar-fill" :style="{ width: `${levelProgress}%` }"></div>
                  </div>
                  <div class="xp-values">
                    <span class="current">{{ userStats.xp % 1000 }}</span>
                    <span class="separator">/</span>
                    <span class="total">1000 XP</span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </FpPageHeader>

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
            <div class="team-avatars" v-if="userTeams.length > 0">
              <div v-for="team in userTeams.slice(0, 3)" :key="team.id" class="team-avatar">
                {{ team.name[0] }}
              </div>
              <div v-if="userTeams.length > 3" class="team-avatar more">
                +{{ userTeams.length - 3 }}
              </div>
            </div>
            <div class="promo-content">
              <div class="promo-text">
                <h3>Твои команды</h3>
                <p v-if="userTeams.length > 0">
                  У тебя уже {{ userTeams.length }} {{ userTeams.length === 1 ? 'команда' : 'команды' }}. Исследуй мир
                  вместе!
                </p>
                <p v-else>Найди единомышленников и проходи маршруты вместе.</p>
              </div>
              <div class="promo-icon">
                <Users :size="32" />
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
            <ArtMap class="home-map" :points="routePoints" :is-clustered="true" @marker-click="handleMarkerClick"
              @map-click="selectedRoute = null" />

            <transition name="slide-up">
              <div v-if="selectedRoute" class="route-mini-popup">
                <div class="popup-content">
                  <div class="route-thumb"
                    :style="selectedRoute.imageUrl ? `background-image: url(${selectedRoute.imageUrl})` : ''">
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
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
  margin-bottom: var(--spacing-lg);

  .accent {
    color: var(--color-primary);
  }

}

.header-subtitle-area {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;

  .subtitle-text {
    font-size: 14px;
    color: var(--color-text-secondary);
  }

  .xp-status-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-top: 6px;
    width: 100%;
    max-width: 280px;

    .lvl-tag {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: var(--color-on-primary);
      width: 36px;
      height: 36px;
      border-radius: 10px;
      box-shadow: 0 4px 10px rgba(255, 215, 0, 0.3);

      .label {
        font-size: 8px;
        font-weight: 900;
        line-height: 1;
        opacity: 0.8;
      }

      .value {
        font-size: 16px;
        font-weight: 900;
        line-height: 1.1;
      }
    }

    .xp-bar-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;

      .xp-bar-track {
        height: 6px;
        background: color-mix(in srgb, var(--color-primary) 15%, transparent);
        border-radius: 3px;
        overflow: hidden;

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-variant));
          border-radius: 3px;
          transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      }

      .xp-values {
        display: flex;
        align-items: center;
        gap: 3px;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.3px;

        .current {
          color: var(--color-primary);
        }

        .separator {
          opacity: 0.4;
          color: var(--color-text-tertiary);
        }

        .total {
          color: var(--color-text-tertiary);
        }
      }
    }
  }
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
    background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
    color: white;
    box-shadow: 0 10px 25px rgba(99, 102, 241, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.1);

    .team-avatars {
      display: flex;
      margin-bottom: 12px;
      padding-left: 4px;

      .team-avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(4px);
        border: 2px solid #6366f1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 800;
        margin-left: -8px;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);

        &:first-child {
          margin-left: 0;
        }

        &.more {
          background: rgba(0, 0, 0, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
        }
      }
    }
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
  from {
    transform: translateY(100%);
    opacity: 0;
  }

  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
  opacity: 0;
}
</style>
