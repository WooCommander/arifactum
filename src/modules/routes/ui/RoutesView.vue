<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import RouteCard from './RouteCard.vue'
import { FpSpinner, FpPullToRefresh, FpInput } from '@/design-system'
import { Plus, Search, X } from 'lucide-vue-next'
import { ref, watch } from 'vue'

import { authStore } from '@/modules/auth/store/authStore'

const router = useRouter()
const { routes, isLoading, error, fetchRoutes } = useRoutesStore()

const searchQuery = ref('')
const selectedCategory = ref('Все')
const categories = ['Все', 'История', 'Мистика', 'Природа', 'Город', 'Для детей', 'Спорт']

onMounted(() => {
  loadRoutes()
})

const loadRoutes = () => {
  fetchRoutes(authStore.currentUserId.value, {
    search: searchQuery.value,
    category: selectedCategory.value
  })
}

// Watch for filter changes instead of manual triggers
watch([searchQuery, selectedCategory], () => {
  loadRoutes()
})

const navigateToDetail = (id: string) => {
  router.push({ name: 'RouteDetail', params: { id } })
}

const handleRefresh = async () => {
  await loadRoutes()
}
</script>

<template>
  <div class="routes-view">
    <header class="routes-header">
      <div class="header-top">
        <div class="header-content">
          <h1>Маршруты</h1>
          <p>Исследуй новые места</p>
        </div>
        <button class="add-button" @click="router.push('/create-route')">
          <Plus :size="24" />
        </button>
      </div>

      <div class="search-container">
        <div class="search-wrapper">
          <Search class="search-icon" :size="18" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Найти приключение..." 
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
            <X :size="16" />
          </button>
        </div>
      </div>

      <div class="categories-bar">
        <div class="categories-scroll">
          <button 
            v-for="cat in categories" 
            :key="cat"
            class="category-chip"
            :class="{ active: selectedCategory === cat }"
            @click="selectedCategory = cat"
          >
            {{ cat }}
          </button>
        </div>
      </div>
    </header>

    <FpPullToRefresh :onRefresh="handleRefresh">
      <div v-if="isLoading && routes.length === 0" class="loader">
        <FpSpinner />
      </div>

      <div v-else-if="error" class="error-state">
        <p>{{ error }}</p>
        <button @click="() => fetchRoutes(authStore.currentUserId.value)" class="retry-btn">Попробовать снова</button>
      </div>

      <div v-else-if="routes.length === 0" class="empty-state">
        <p>Маршрутов пока нет. Будь первым, кто создаст!</p>
      </div>

      <div v-else class="routes-grid">
        <RouteCard 
          v-for="route in routes" 
          :key="route.id" 
          :route="route"
          @click="navigateToDetail"
        />
      </div>
    </FpPullToRefresh>
  </div>
</template>

<style scoped lang="scss">
.routes-view {
  padding-bottom: 80px; // bottom nav height
  min-height: 100vh;
  background: var(--color-background);
}

.routes-header {
  padding: 24px 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background: var(--color-surface);
  position: sticky;
  top: 0;
  z-index: 100;
  border-bottom: 1px solid var(--color-border);
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-content {
  h1 {
    font-size: 24px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0;
  }

  p {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 2px 0 0;
  }
}

.search-container {
  width: 100%;
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--color-background);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0 12px;
  height: 44px;
  transition: border-color 0.2s;

  &:focus-within {
    border-color: var(--color-primary);
  }

  .search-icon {
    color: var(--color-text-tertiary);
    margin-right: 8px;
  }

  .search-input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-size: 14px;
    color: var(--color-text-primary);
    
    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }

  .clear-search {
    background: none;
    border: none;
    color: var(--color-text-tertiary);
    padding: 4px;
    cursor: pointer;
  }
}

.categories-bar {
  margin: 0 -20px;
}

.categories-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 0 20px 4px;
  
  &::-webkit-scrollbar {
    display: none;
  }
}

.category-chip {
  padding: 6px 14px;
  border-radius: var(--radius-pill);
  background: var(--color-background);
  border: 1px solid var(--color-border);
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-secondary);
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;

  &.active {
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-color: var(--color-primary);
    box-shadow: 0 4px 10px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }
}

.add-button {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-2);
  cursor: pointer;
  transition: transform 0.2s ease;

  &:active {
    transform: scale(0.9);
  }
}

.routes-grid {
  padding: 0 20px 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.loader, .error-state, .empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.error-state p, .empty-state p {
  color: var(--color-text-secondary);
  font-size: 16px;
  margin-bottom: 16px;
}

.retry-btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  font-weight: 700;
  cursor: pointer;
}
</style>
