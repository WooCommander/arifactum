<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  (e: 'refresh', done: () => void): void
}>()

const isPulling = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const startY = ref(0)
const currentY = ref(0)
const DISTANCE_THRESHOLD = 60
const MAX_PULL = 120
const containerRef = ref<HTMLElement | null>(null)

const onTouchStart = (e: TouchEvent) => {
  if (isRefreshing.value) return
  // Enable pull only if scrolled to top
  const scrollTop = document.documentElement.scrollTop || document.body.scrollTop || containerRef.value?.scrollTop || 0
  if (scrollTop > 5) return 
  
  startY.value = e.touches[0].clientY
  isPulling.value = true
}

const onTouchMove = (e: TouchEvent) => {
  if (!isPulling.value || isRefreshing.value) return
  
  currentY.value = e.touches[0].clientY
  const distance = currentY.value - startY.value
  
  if (distance > 0) {
    // Apply friction to the pull distance
    pullDistance.value = Math.min(distance * 0.4, MAX_PULL)
    if (e.cancelable) e.preventDefault() // Prevent native pull-to-refresh
  }
}

const onTouchEnd = () => {
  if (!isPulling.value) return
  isPulling.value = false
  
  if (pullDistance.value >= DISTANCE_THRESHOLD) {
    isRefreshing.value = true
    pullDistance.value = DISTANCE_THRESHOLD
    emit('refresh', () => {
      isRefreshing.value = false
      pullDistance.value = 0
    })
  } else {
    // Snap back
    pullDistance.value = 0
  }
}
</script>

<template>
  <div class="fp-pull-to-refresh" 
       ref="containerRef"
       @touchstart="onTouchStart" 
       @touchmove="onTouchMove" 
       @touchend="onTouchEnd"
       @touchcancel="onTouchEnd">
    
    <div class="pull-indicator" :style="{ 
      height: `${Math.max(0, pullDistance)}px`,
      opacity: Math.min(1, pullDistance / DISTANCE_THRESHOLD)
    }">
      <div class="spinner-container" :class="{ refreshing: isRefreshing }">
        <svg v-if="!isRefreshing" class="arrow-icon" :style="{ transform: `rotate(${pullDistance >= DISTANCE_THRESHOLD ? 180 : 0}deg)` }" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <polyline points="19 12 12 19 5 12"></polyline>
        </svg>
        <div v-else class="loader-circle"></div>
      </div>
    </div>
    
    <div class="ptr-content" :style="{ transform: `translateY(${isRefreshing ? DISTANCE_THRESHOLD : pullDistance}px)` }">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.fp-pull-to-refresh {
  position: relative;
  width: 100%;
}

.pull-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.3s ease, opacity 0.3s ease;
  z-index: 10;
}

.spinner-container {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-surface);
  box-shadow: var(--shadow-2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);

  .arrow-icon {
    width: 20px;
    height: 20px;
    transition: transform 0.2s ease;
  }
}

.loader-circle {
  width: 20px;
  height: 20px;
  border: 2px solid var(--color-primary);
  border-bottom-color: transparent;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.ptr-content {
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
}
</style>
