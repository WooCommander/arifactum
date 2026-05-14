<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import RouteCard from './RouteCard.vue'
import { FpSpinner, FpPullToRefresh, FpPageHeader, FpButton } from '@/design-system'
import { Plus, Search, X } from 'lucide-vue-next'
import { ref, watch, computed } from 'vue'

import { authStore } from '@/modules/auth/store/authStore'
import { useCategoryStore } from '../state/useCategoryStore'

const router = useRouter()
const { routes, isLoading, error, fetchRoutes } = useRoutesStore()

const searchQuery = ref('')
const selectedCategory = ref('Все')
const selectedAuthor = ref<{ id: string, name: string } | null>(null)
const { categoryNames, init: initCategories } = useCategoryStore()

const popularTags = computed(() => {
  // Собираем все теги из загруженных маршрутов
  const allTags = routes.value.flatMap(r => r.tags || [])
  const counts = allTags.reduce((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([tag]) => tag)
})

onMounted(() => {
  initCategories()
  loadRoutes()
})

const loadRoutes = () => {
  fetchRoutes(authStore.currentUserId.value, {
    search: searchQuery.value,
    category: selectedCategory.value,
    authorId: selectedAuthor.value?.id
  })
}

const handleAuthorFilter = (author: { id: string, name: string }) => {
  selectedAuthor.value = author
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const clearAuthorFilter = () => {
  selectedAuthor.value = null
}

// Watch for filter changes instead of manual triggers
watch([searchQuery, selectedCategory, selectedAuthor], () => {
  loadRoutes()
})

const navigateToDetail = (id: string) => {
  router.push({ name: 'RouteDetail', params: { id } })
}

const handleRefresh = async () => {
  await loadRoutes()
}

const handleWheel = (e: WheelEvent) => {
  if (e.deltaY === 0) return
  const container = e.currentTarget as HTMLElement
  container.scrollLeft += e.deltaY
  e.preventDefault()
}
</script>

<template>
  <div class="routes-view page-container">
    <div class="sticky-header-container">
      <FpPageHeader title="Маршруты" subtitle="Исследуй новые места">
        <template #actions>
          <FpButton size="sm" @click="router.push('/create-route')">
            <Plus :size="20" />
          </FpButton>
        </template>
      </FpPageHeader>

      <div class="search-section">
        <div class="search-wrapper">
          <Search class="search-icon" :size="18" />
          <input v-model="searchQuery" type="text" placeholder="Найти приключение..." class="search-input" />
          <button v-if="searchQuery" class="clear-search" @click="searchQuery = ''">
            <X :size="16" />
          </button>
        </div>

        <div class="tags-cloud" v-if="popularTags.length > 0">
          <div class="tags-scroll" @wheel.passive="handleWheel" @wheel.prevent="handleWheel">
            <button v-for="tag in popularTags" :key="tag" class="tag-pill" :class="{ active: searchQuery === tag }"
              @click="searchQuery = searchQuery === tag ? '' : tag">
              #{{ tag }}
            </button>
          </div>
        </div>

        <div class="categories-bar">
          <div class="categories-scroll" @wheel.passive="handleWheel" @wheel.prevent="handleWheel">
            <button v-for="cat in ['Все', ...categoryNames]" :key="cat" class="category-chip"
              :class="{ active: selectedCategory === cat }" @click="selectedCategory = cat">
              {{ cat }}
            </button>
          </div>
        </div>

        <div class="active-filters" v-if="selectedAuthor">
          <div class="filter-chip author" @click="clearAuthorFilter">
            <span>Автор: {{ selectedAuthor.name }}</span>
            <X :size="14" />
          </div>
        </div>
      </div>
    </div>

    <div class="routes-content">
      <FpPullToRefresh @refresh="handleRefresh">
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
          <RouteCard v-for="route in routes" :key="route.id" :route="route" @click="navigateToDetail"
            @author-click="handleAuthorFilter" />
        </div>
      </FpPullToRefresh>
    </div>
  </div>
</template>

<style scoped lang="scss">
.routes-view {
  height: calc(100vh - 64px); // Adjust based on bottom nav height if needed
  display: flex;
  flex-direction: column;
  overflow: hidden;
  gap: 0 !important;
}

.sticky-header-container {
  flex-shrink: 0;
  padding: 0 0 12px;
  background: var(--color-background);
  z-index: 10;
}

.search-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-bottom: 4px;
}

.routes-content {
  flex: 1;
  overflow-y: auto;
  padding-top: 4px;
  margin-top: 0;
  
  /* Hide scrollbar but keep functionality */
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
}



.search-container {
  margin-bottom: 12px;
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
  margin: 4px 0 0;
}

.categories-scroll {
  display: flex;
  gap: 12px;
  overflow-x: auto;
  padding: 4px 0 16px;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* IE/Edge */

  &::-webkit-scrollbar {
    display: none;
    /* Chrome/Safari/Opera */
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

.tags-cloud {
  position: relative;
  margin-top: 4px;
}

.tags-scroll {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0 12px;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  /* Firefox */
  -ms-overflow-style: none;
  /* IE/Edge */

  &::-webkit-scrollbar {
    display: none;
    /* Chrome/Safari/Opera */
  }
}

.tag-pill {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-surface) 60%, var(--color-background));
  border: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-secondary);
  white-space: nowrap;
  transition: all 0.2s ease;

  &.active {
    background: var(--color-primary);
    color: var(--color-on-primary);
    border-color: var(--color-primary);
  }
}



.routes-grid {
  padding: 16px 0 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

.loader,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 40px;
  text-align: center;
}

.error-state p,
.empty-state p {
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

.active-filters {
  display: flex;
  gap: 8px;
  padding: 0 16px 8px;
  margin-top: -4px;
}

.filter-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 20%, transparent);
  animation: slide-in 0.3s ease-out;

  @keyframes slide-in {
    from {
      transform: translateX(-10px);
      opacity: 0;
    }

    to {
      transform: translateX(0);
      opacity: 1;
    }
  }

  &.author {
    background: var(--color-surface);
    color: var(--color-primary);
    border: 1px solid var(--color-primary);
  }
}
</style>
