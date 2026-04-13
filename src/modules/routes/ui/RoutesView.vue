<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import RouteCard from './RouteCard.vue'
import { FpSpinner, FpPullToRefresh } from '@/design-system'
import { Plus } from 'lucide-vue-next'

import { authStore } from '@/modules/auth/store/authStore'

const router = useRouter()
const { routes, isLoading, error, fetchRoutes } = useRoutesStore()

onMounted(() => {
  fetchRoutes(authStore.currentUserId.value)
})

const navigateToDetail = (id: string) => {
  router.push({ name: 'RouteDetail', params: { id } })
}

const handleRefresh = async () => {
  await fetchRoutes(authStore.currentUserId.value)
}
</script>

<template>
  <div class="routes-view">
    <header class="routes-header">
      <div class="header-content">
        <h1>Маршруты</h1>
        <p>Исследуй новые места и получай бонусы</p>
      </div>
      <button class="add-button" @click="router.push('/create-route')">
        <Plus :size="24" />
      </button>
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
  padding: 32px 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(to bottom, var(--color-surface) 0%, var(--color-background) 100%);

  h1 {
    font-size: 28px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0;
  }

  p {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 4px 0 0;
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
