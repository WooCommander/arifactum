<script setup lang="ts">
import { onMounted, onUnmounted, ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { FpSpinner, FpBackButton } from '@/design-system'
import ArtMap from '@/shared/ui/ArtMap.vue'
import { MapPin, Info, Users, Navigation } from 'lucide-vue-next'
import { Geolocation } from '@capacitor/geolocation'
import { isWithinRange } from '@/shared/lib/geoUtils'
import confetti from 'canvas-confetti'
import { useRewardsStore } from '@/modules/rewards'

const route = useRoute()
const router = useRouter()
const { currentRoute, currentCheckpoints, isLoading, error, fetchRouteDetails, clearCurrentRoute } = useRoutesStore()

const isActiveMode = ref(false)
const userLocation = ref<[number, number] | null>(null)
const completedCheckpointIds = ref<Set<string>>(new Set())

const mapPoints = computed(() => 
  currentCheckpoints.value.map(cp => ({
    lat: cp.latitude,
    lng: cp.longitude,
    id: cp.id,
    title: cp.title,
    isCompleted: completedCheckpointIds.value.has(cp.id)
  }))
)

const nextCheckpoint = computed(() => {
  return currentCheckpoints.value.find(cp => !completedCheckpointIds.value.has(cp.id))
})

const isNearNext = computed(() => {
  if (!nextCheckpoint.value || !userLocation.value) return false
  return isWithinRange(
    userLocation.value[0],
    userLocation.value[1],
    nextCheckpoint.value.latitude,
    nextCheckpoint.value.longitude,
    100 // Увеличим до 100м для теста
  )
})

const { awardCompletion } = useRewardsStore()

const handleCheckIn = async () => {
  if (nextCheckpoint.value) {
    completedCheckpointIds.value.add(nextCheckpoint.value.id)
    
    // Check if that was the last one
    if (completedCheckpointIds.value.size === currentCheckpoints.value.length) {
       confetti({
         particleCount: 150,
         spread: 70,
         origin: { y: 0.6 },
         colors: ['#FFD700', '#1E90FF', '#ffffff']
       })
       
       if (currentRoute.value) {
         try {
           await awardCompletion(currentRoute.value.id, currentRoute.value.title)
         } catch (e) {
           console.error('Failed to award completion:', e)
         }
       }
       
       // Success timeout
       setTimeout(() => {
         isActiveMode.value = false
         alert('Поздравляем! Вы прошли маршрут и получили артефакт!')
       }, 2000)
    }
  }
}

onMounted(async () => {
  const id = route.params.id as string
  if (id) fetchRouteDetails(id)
  
  // Try to get location
  try {
    const pos = await Geolocation.getCurrentPosition()
    userLocation.value = [pos.coords.latitude, pos.coords.longitude]
  } catch (e) {
    console.warn('Geolocation not available')
  }
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
        <ArtMap 
          v-if="mapPoints.length > 0" 
          :points="mapPoints" 
          :interactive="!isActiveMode"
        />
        <div v-else-if="currentRoute.imageUrl" class="hero-image-wrap">
          <img :src="currentRoute.imageUrl" :alt="currentRoute.title" />
        </div>
        <div v-else class="hero-placeholder">
          <MapPin :size="64" />
        </div>
        <div class="hero-header">
           <FpBackButton @click="router.back()" class="back-btn" />
        </div>
      </div>

      <div class="route-info-card">
        <h1>{{ currentRoute.title }}</h1>
        
        <div v-if="currentRoute.images && currentRoute.images.length > 0" class="route-gallery">
          <div v-for="(img, idx) in currentRoute.images" :key="idx" class="gallery-item">
            <img :src="img" alt="Gallery image" />
          </div>
        </div>

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
            :class="{ completed: completedCheckpointIds.has(cp.id), next: nextCheckpoint?.id === cp.id }"
          >
            <div class="checkpoint-number">{{ cp.order }}</div>
            <div class="checkpoint-body">
              <h3>{{ cp.title }}</h3>
              <p>{{ cp.description }}</p>
              
              <div v-if="cp.images && cp.images.length > 0" class="checkpoint-gallery">
                <div v-for="(img, idx) in cp.images" :key="idx" class="gallery-thumb">
                  <img :src="img" alt="Checkpoint image" />
                </div>
              </div>
            </div>
            <div v-if="completedCheckpointIds.has(cp.id)" class="check-icon">✅</div>
          </div>
        </div>
      </div>

      <div class="bottom-action">
        <template v-if="!isActiveMode">
          <button class="start-btn" @click="isActiveMode = true">
            <Navigation :size="20" /> Начать маршрут
          </button>
        </template>
        <template v-else>
          <div class="active-actions">
            <button class="stop-btn" @click="isActiveMode = false">
              Выход
            </button>
            <button 
              class="check-btn" 
              :disabled="!isNearNext || !nextCheckpoint"
              @click="handleCheckIn"
            >
              Отметиться ({{ nextCheckpoint?.order || '-' }})
            </button>
          </div>
        </template>
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

  .route-gallery {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding: 4px 0 16px;
    margin: 0 -4px;
    scrollbar-width: none;

    &::-webkit-scrollbar { display: none; }

    .gallery-item {
      flex: 0 0 120px;
      height: 80px;
      border-radius: var(--radius-md);
      overflow: hidden;
      box-shadow: var(--shadow-sm);
      cursor: pointer;
      transition: transform 0.2s;

      &:active { transform: scale(0.95); }

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }
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
  transition: all 0.3s ease;

  &.completed {
    border-color: var(--color-success);
    background: color-mix(in srgb, var(--color-success) 5%, var(--color-surface));
    opacity: 0.8;
    .checkpoint-number { background: var(--color-success); }
  }

  &.next {
    border-color: var(--color-primary);
    border-width: 2px;
    box-shadow: var(--shadow-2);
    transform: scale(1.02);
  }
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
    margin: 0 0 8px;
  }
}

.checkpoint-gallery {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px 0;
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }

  .gallery-thumb {
    flex: 0 0 60px;
    height: 44px;
    border-radius: var(--radius-sm);
    overflow: hidden;
    
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}

.check-icon {
  font-size: 20px;
  margin-left: auto;
}

.active-actions {
  display: flex;
  gap: 12px;
  width: 100%;
}

.stop-btn {
  flex: 1;
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  border: 1.5px solid var(--color-border);
  font-size: 16px;
  font-weight: 700;
}

.check-btn {
  flex: 2;
  padding: 18px;
  border-radius: var(--radius-md);
  background: var(--color-primary);
  color: var(--color-on-primary);
  border: none;
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
  
  &:disabled {
    background: var(--color-text-disabled);
    box-shadow: none;
    opacity: 0.6;
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
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;

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
