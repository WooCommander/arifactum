<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { AuthService } from '@/modules/auth/services/AuthService'
import FpCard from '@/design-system/components/FpCard.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import { FpPullToRefresh } from '@/design-system'
import { Users, Navigation } from 'lucide-vue-next'

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

// Personalized Data
const userStats = ref<any>(null)
const isLoading = ref(true)

const loadData = async () => {
  isLoading.value = true
  try {
    const [stats, profile] = await Promise.all([
      AuthService.getUserStats(),
      AuthService.getProfile()
    ])
    userStats.value = stats
    userProfile.value = profile
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
        <div class="hero-top">
          <div class="hero-content">
            <h1 class="welcome-text">{{ greeting }}, <span class="accent">{{ userName }}</span></h1>
            <p class="hero-subtitle">Твой прогресс в Artifactum</p>
          </div>
        </div>

        <FpCard v-if="userStats" class="profile-card">
          <div class="profile-header">
            <div class="level-badge">LVL {{ userStats.level }}</div>
            <div class="profile-main">
              <span class="level-title">{{ userStats.levelTitle }}</span>
              <span class="points-text">{{ userStats.reputation }} очков репутации</span>
            </div>
          </div>
          <div class="progress-container">
            <div class="progress-bar">
              <div class="progress-fill"
                :style="{ width: Math.min(100, (userStats.reputation / userStats.nextLevelThreshold) * 100) + '%' }">
              </div>
            </div>
            <div class="progress-labels">
              <span>{{ userStats.reputation }}</span>
              <span>{{ userStats.nextLevelThreshold }}</span>
            </div>
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
              <div class="promo-icon"><Navigation :size="48" /></div>
            </div>
          </FpCard>

          <FpCard class="promo-card team-card" @click="router.push('/teams')">
            <div class="promo-content">
              <div class="promo-text">
                <h3>Твои команды</h3>
                <p>Проходи маршруты вместе с друзьями и соревнуйся с другими.</p>
              </div>
              <div class="promo-icon"><Users :size="48" /></div>
            </div>
          </FpCard>
        </section>

        <!-- Placeholder for active quest if exists -->
        <section v-if="userStats?.activeRoute" class="active-quest">
           <div class="section-header">
             <h2 class="section-title">Текущий квест 🏃</h2>
           </div>
           <FpCard class="active-card" @click="router.push(`/route/${userStats.activeRoute.id}`)">
              <div class="active-info">
                <h4>{{ userStats.activeRoute.title }}</h4>
                <p>Выполнено {{ userStats.activeRoute.completedCount }} из {{ userStats.activeRoute.totalCount }} точек</p>
              </div>
              <div class="active-arrow">→</div>
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
  padding: 24px 20px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 10%, transparent) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;

  .welcome-text {
    font-size: 26px;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.5px;
    color: var(--color-text-primary);

    .accent {
      color: var(--color-primary);
    }
  }

  .hero-subtitle {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 4px 0 0;
  }
}

.profile-card {
  background: var(--color-surface);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--color-border);
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.level-badge {
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-size: 12px;
  font-weight: 800;
  padding: 4px 12px;
  border-radius: 20px;
  box-shadow: 0 4px 10px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.profile-main {
  display: flex;
  flex-direction: column;

  .level-title {
    font-size: 16px;
    font-weight: 700;
  }

  .points-text {
    font-size: 12px;
    color: var(--color-text-tertiary);
  }
}

.progress-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.progress-bar {
  height: 6px;
  background: var(--color-surface-hover);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-variant));
  border-radius: 3px;
  transition: width 1s ease;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.dashboard-content {
  padding: 0 20px 40px;
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
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.2));
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
</style>
```
