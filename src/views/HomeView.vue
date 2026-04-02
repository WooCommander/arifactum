<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { shoppingListStore } from '@/modules/shopping-list/state/shoppingListStore'
import { useNotesStore } from '@/modules/notes/state/useNotesStore'
import { AuthService } from '@/modules/auth/services/AuthService'
import { useBirthdaysStore } from '@/modules/birthdays/state/useBirthdaysStore'
import { getDaysUntilNext, getTurningAge, getZodiac } from '@/modules/birthdays/lib/birthdayUtils'
import FpCard from '@/design-system/components/FpCard.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import { FpPullToRefresh } from '@/design-system'

const router = useRouter()

// Stats Data
// Destructure for easier use and reactivity in template
const {
  // recentUpdates,
  favoriteProductIds,
  // isFavorite,
  totalProductCount,
  totalCategoryCount,
  totalUserCount,
} = catalogStore

const { uncheckedItems } = shoppingListStore

const shoppingItemsLeft = computed(() => uncheckedItems.value.length)
const favoriteCount = computed(() => favoriteProductIds.value.size)
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

// Birthdays
const birthdayStore = useBirthdaysStore()
const upcomingBirthdays = computed(() => {
  return birthdayStore.birthdays.value
    .filter(b => {
      const days = getDaysUntilNext(b.day, b.month)
      return days <= 14 // Следующие 2 недели
    })
    .sort((a, b) => getDaysUntilNext(a.day, a.month) - getDaysUntilNext(b.day, b.month))
    .slice(0, 3)
})

// Notes
const notesStore = useNotesStore()
const lastNote = computed(() => notesStore.notes.value[0] || null)

// Personalized Data
const userStats = ref<any>(null)
const isLoading = ref(true)

const monthNames = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
]

const formatBdayDate = (day: number, month: number) => {
  return `${day} ${monthNames[month - 1]}`
}

// const toggleFavorite = async (productId: string) => {
//     await catalogStore.toggleFavorite(productId)
// }

const loadData = async () => {
  isLoading.value = true
  try {
    const [stats, profile] = await Promise.all([
      AuthService.getUserStats(),
      AuthService.getProfile(),
      catalogStore.loadFavorites(),
      catalogStore.loadDashboardStats(),
      shoppingListStore.loadItems ? shoppingListStore.loadItems() : Promise.resolve(),
      birthdayStore.fetchBirthdays(),
      notesStore.fetchNotes()
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
            <p class="hero-subtitle">Твой прогресс в Fair Price</p>
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
        <!-- Personalized Stats -->
        <section class="stats-grid">
          <FpCard class="stat-card" @click="router.push('/shopping-list')">
            <div class="stat-icon list">🛒</div>
            <div class="stat-info">
              <span class="stat-value">{{ shoppingItemsLeft }}</span>
              <span class="stat-label">В списке</span>
            </div>
          </FpCard>

          <FpCard class="stat-card" @click="router.push('/favorites')">
            <div class="stat-icon favorites">⭐</div>
            <div class="stat-info">
              <span class="stat-value">{{ favoriteCount }}</span>
              <span class="stat-label">Избранные</span>
            </div>
          </FpCard>

          <FpCard v-if="userStats" class="stat-card contribution">
            <div class="stat-icon contr">🏷️</div>
            <div class="stat-info">
              <span class="stat-value">{{ userStats.pricesSubmitted }}</span>
              <span class="stat-label">Вклад</span>
            </div>
          </FpCard>
        </section>

        <!-- Upcoming Birthdays Widget -->
        <section v-if="upcomingBirthdays.length > 0" class="birthdays-section">
          <div class="section-header">
            <h2 class="section-title">Ближайшие праздники 🎁</h2>
            <FpButton variant="text" size="sm" @click="router.push('/birthdays')">Все</FpButton>
          </div>
          <div class="birthdays-list">
            <div v-for="b in upcomingBirthdays" :key="b.id" class="birthday-mini-card"
              :class="{ 'is-today': getDaysUntilNext(b.day, b.month) === 0 }" @click="router.push('/birthdays')">
              <div class="b-icon">{{ getDaysUntilNext(b.day, b.month) === 0 ? '🎂' : '🎉' }}</div>
              <div class="b-info">
                <div class="b-main-row">
                  <span class="b-name">{{ b.name }}</span>
                  <span class="b-zodiac">{{ getZodiac(b.day, b.month).split(' ')[0] }}</span>
                </div>
                <div class="b-sub-row">
                  <span class="b-date">{{ formatBdayDate(b.day, b.month) }}</span>
                  <span v-if="getTurningAge(b.year, b.day, b.month)" class="b-age">• {{ getTurningAge(b.year, b.day, b.month) }} лет</span>
                  <span class="b-sep">•</span>
                  <span class="b-countdown" :class="{ 'is-active': getDaysUntilNext(b.day, b.month) < 3 }">
                    {{ getDaysUntilNext(b.day, b.month) === 0 ? 'Сегодня!' : `${getDaysUntilNext(b.day, b.month)} дн.` }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Last Note Widget -->
        <section v-if="lastNote" class="notes-preview-section">
          <div class="section-header">
            <h2 class="section-title">Последняя заметка 📝</h2>
            <FpButton variant="text" size="sm" @click="router.push('/notes')">Все</FpButton>
          </div>
          <FpCard class="note-card" @click="router.push('/notes')">
            <h3 class="note-card__title">{{ lastNote.title }}</h3>
            <p class="note-card__text">{{ lastNote.content }}</p>
            <div class="note-card__footer">
              <span class="note-card__date">{{ new Date(lastNote.created_at).toLocaleDateString('ru-RU') }}</span>
            </div>
          </FpCard>
        </section>

        <!-- Quick Actions -->
        <section class="actions-row">
          <button class="action-btn-circle" @click="router.push('/add-price')" title="Добавить цену">
            <span class="icon">+</span>
            <span class="label">Цена</span>
          </button>
          <button class="action-btn-circle" @click="router.push('/catalog')" title="Каталог">
            <span class="icon">📦</span>
            <span class="label">Каталог</span>
          </button>
          <button class="action-btn-circle" @click="router.push('/stores')" title="Магазины">
            <span class="icon">🏪</span>
            <span class="label">Магазины</span>
          </button>
          <button class="action-btn-circle" @click="router.push('/shopping-list')" title="Список покупок">
            <span class="icon">🛒</span>
            <span class="label">Список</span>
          </button>
          <button class="action-btn-circle" @click="router.push('/notes')" title="Заметки">
            <span class="icon">📝</span>
            <span class="label">Заметки</span>
          </button>
        </section>



        <!-- Global Insights (Small) - Moved to bottom -->
        <div class="global-mini-stats">
          <div class="mini-stat">
            <span>📦<br> {{ totalProductCount }}<br> товаров</span>
          </div>
          <div class="mini-stat">
            <span>👥<br> {{ totalUserCount }}<br> контрибьюторов</span>
          </div>
          <div class="mini-stat">
            <span>📂<br> {{ totalCategoryCount }}<br> категорий</span>
          </div>
        </div>
      </div>
    </FpPullToRefresh>
  </div>
</template>

<style scoped lang="scss">
// Hero Section Refined
.dashboard-hero {
  padding: var(--spacing-sm);
  background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 12%, transparent) 0%, transparent 100%);
  display: flex;
  flex-direction: column;
  gap: 20px;

  .hero-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }

  .hero-content {
    margin: 0;
  }

  .welcome-text {
    font-size: 24px;
    font-weight: 800;
    margin: 0;
    letter-spacing: -0.5px;

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

// Profile Card
.profile-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-md);
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
  padding: 4px 10px;
  border-radius: 20px;
  box-shadow: 0 4px 8px color-mix(in srgb, var(--color-primary) 30%, transparent);
}

.profile-main {
  display: flex;
  flex-direction: column;

  .level-title {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
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
  background: var(--color-background);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary), var(--color-primary-variant));
  border-radius: 3px;
  transition: width 1s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.dashboard-content {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding: 0 var(--spacing-sm) 40px;
}

// Stats Grid
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  .stat-card {
    padding: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;

    &:active {
      transform: scale(0.95);
    }

    &.contribution {
      background: color-mix(in srgb, var(--color-primary) 3%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
  }

  .stat-icon {
    font-size: 18px;
    width: 32px;
    height: 32px;
    background: var(--color-background);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .stat-info {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: .1rem;
  }

  .stat-value {
    font-size: 18px;

    font-weight: 800;
    color: var(--color-text-primary);
  }

  .stat-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--color-text-secondary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
}

.global-mini-stats {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 0 4px;

  .mini-stat {
    font-size: 1rem;
    color: var(--color-text-tertiary);
    font-weight: 600;
    background: var(--color-surface);
    padding: 6px 12px;
    border-radius: 20px;
    border: 1px solid var(--color-border);
    flex: 1;
    text-align: center;
  }
}




// Birthdays Section

.full-history-btn {
  margin-top: 8px;
  width: 100%;
}

.actions-row {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;

  .action-btn-circle {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    background: none;
    border: none;
    cursor: pointer;

    .icon {
      width: 48px;
      height: 48px;
      background: var(--color-primary);
      color: var(--color-on-primary);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
      transition: all 0.2s;
    }

    .label {
      font-size: 11px;
      font-weight: 600;
      color: var(--color-text-primary);
    }

    &:active .icon {
      transform: scale(0.9);
    }
  }
}

.empty-state {
  text-align: center;
  padding: 32px 20px;
  background: var(--color-surface);
  border-radius: 16px;
  border: 1px dashed var(--color-border);
  color: var(--color-text-secondary);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;

  .icon {
    font-size: 32px;
    opacity: 0.5;
  }

  p {
    margin: 0;
    font-size: 13px;
    line-height: 1.5;
  }
}

// Birthdays Section
.birthdays-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.birthday-mini-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  cursor: pointer;
  transition: background 0.2s;

  &:active {
    background: var(--color-surface-hover);
  }

  &.is-today {
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
    border-color: var(--color-primary);

    .b-icon {
      background: var(--color-primary);
      color: var(--color-on-primary);
    }

    .b-info {
      .b-countdown, .b-meta {
        color: var(--color-primary);
      }
    }
  }

  .b-icon {
    font-size: 18px;
    width: 36px;
    height: 36px;
    background: var(--color-background);
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .b-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
    gap: 2px;
  }

  .b-main-row {
    display: flex;
    align-items: center;
    gap: 8px;
    line-height: 1.2;
  }

  .b-name {
    font-size: 15px;
    font-weight: 700;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .b-zodiac {
    font-size: 15px;
    opacity: 0.8;
  }

  .b-sub-row {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: var(--color-text-secondary);
    line-height: 1.4;

    .b-sep {
      opacity: 0.3;
    }
  }

  .b-countdown {
    font-weight: 700;
    color: var(--color-text-tertiary);

    &.is-active {
      color: var(--color-primary);
    }
  }

  &.is-today {
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
    border-color: var(--color-primary);

    .b-info {
      .b-countdown, .b-sub-row {
        color: var(--color-primary);
      }
      .b-sep {
        opacity: 0.5;
      }
    }
  }
}

// Notes Preview
.notes-preview-section {
  display: flex;
  flex-direction: column;
}

.note-card {
  padding: 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: background 0.2s;

  &:active {
    background: var(--color-surface-hover);
  }

  &__title {
    font-size: 16px;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0;
  }

  &__text {
    font-size: 14px;
    color: var(--color-text-secondary);
    line-height: 1.5;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 3;
    line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    margin-top: 4px;
  }

  &__date {
    font-size: 11px;
    color: var(--color-text-tertiary);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  .section-title {
    font-size: 16px;
    font-weight: 700;
    margin: 0;
    color: var(--color-text-primary);
  }
}
</style>
```
