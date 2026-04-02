<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { FpSpinner, FpBackButton } from '@/design-system'
import { MapPin, Info, Users } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const { currentRoute, currentCheckpoints, isLoading, error, fetchRouteDetails, clearCurrentRoute } = useRoutesStore()

onMounted(() => {
  const id = route.params.id as string
  if (id) fetchRouteDetails(id)
})

onUnmounted(() => {
  clearCurrentRoute()
})
</script>

<template>
  <div class="route-detail-view">
    <div v-if="isLoading" class="loader">
      <FpSpinner />
    </div>

    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <FpBackButton @click="router.back()" />
    </div>

    <div v-else-if="currentRoute" class="route-detail-content">
      <div class="route-hero">
        <img v-if="currentRoute.imageUrl" :src="currentRoute.imageUrl" :alt="currentRoute.title" />
        <div v-else class="hero-placeholder">
          <MapPin :size="64" />
        </div>
        <div class="hero-header">
           <FpBackButton @click="router.back()" class="back-btn" />
        </div>
      </div>

      <div class="route-info-card">
        <h1>{{ currentRoute.title }}</h1>
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
            <Users :size="20" />
            <span>Команды: Да</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Точки маршрута</h2>
        <div class="checkpoints-list">
          <div 
            v-for="cp in currentCheckpoints" 
            :key="cp.id" 
            class="checkpoint-item"
          >
            <div class="checkpoint-number">{{ cp.order }}</div>
            <div class="checkpoint-body">
              <h3>{{ cp.title }}</h3>
              <p>{{ cp.description }}</p>
            </div>
          </div>
        </div>
      </div>

      <div class="bottom-action">
        <button class="start-btn">Начать маршрут</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.route-detail-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: 100px;
}

.route-hero {
  height: 280px;
  position: relative;
  background: #f1f5f9;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
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
    z-index: 10;
  }
}

.route-info-card {
  margin: -40px 20px 0;
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  padding: 24px;
  box-shadow: var(--shadow-2);
  position: relative;
  z-index: 5;
  border: 1px solid var(--color-border);

  h1 {
    font-size: 24px;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0 0 12px;
  }

  .description {
    font-size: 15px;
    color: var(--color-text-secondary);
    line-height: 1.6;
    margin-bottom: 20px;
  }
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border);
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-text-secondary);
  text-align: center;

  svg {
    color: var(--color-primary);
  }

  .easy { color: var(--color-success); }
  .medium { color: var(--color-warning); }
  .hard { color: var(--color-error); }
}

.section {
  padding: 32px 20px 0;

  h2 {
    font-size: 20px;
    font-weight: 800;
    margin-bottom: 16px;
    color: var(--color-text-primary);
  }
}

.checkpoints-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.checkpoint-item {
  display: flex;
  gap: 16px;
  background: var(--color-surface);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-sm);
}

.checkpoint-number {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  flex-shrink: 0;
}

.checkpoint-body {
  h3 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px;
  }
  p {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.bottom-action {
  position: fixed;
  bottom: 24px;
  left: 20px;
  right: 20px;
  z-index: 100;
}

.start-btn {
  width: 100%;
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
  cursor: pointer;

  &:active {
    transform: scale(0.98);
  }
}

.loader, .error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100vh;
  padding: 40px;
}
</style>
