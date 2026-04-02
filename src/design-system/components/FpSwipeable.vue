<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  leftThreshold?: number
  rightThreshold?: number
  leftBgColor?: string
  rightBgColor?: string
}>()

const emit = defineEmits<{
  (e: 'swipe-left'): void
  (e: 'swipe-right'): void
}>()

const thresholdL = props.leftThreshold || -80 // Swipe left to -80px to trigger
const thresholdR = props.rightThreshold || 80 // Swipe right to 80px to trigger

const currentX = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const startY = ref(0)
const isScrolling = ref(false)

const onTouchStart = (e: TouchEvent) => {
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
  isDragging.value = true
  isScrolling.value = false
}

const onTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return
  
  const dx = e.touches[0].clientX - startX.value
  const dy = e.touches[0].clientY - startY.value
  
  // If scrolling vertically, abandon horizontal swipe
  if (!isScrolling.value && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
    isScrolling.value = true
    isDragging.value = false
    currentX.value = 0
    return
  }

  if (!isScrolling.value) {
    currentX.value = dx
    // Resistence string effect past 120px
    if (currentX.value > 120) currentX.value = 120 + (currentX.value - 120) * 0.2
    if (currentX.value < -120) currentX.value = -120 + (currentX.value + 120) * 0.2
    
    // Prevent scrolling default behavior only if explicitly swiping horizontally
    if (Math.abs(dx) > 10) e.preventDefault()
  }
}

const onTouchEnd = () => {
  if (!isDragging.value) return
  isDragging.value = false
  
  if (currentX.value <= thresholdL) {
    emit('swipe-left')
  } else if (currentX.value >= thresholdR) {
    emit('swipe-right')
  }
  
  // Snap back
  requestAnimationFrame(() => {
    currentX.value = 0
  })
}
</script>

<template>
  <div class="fp-swipeable" 
       @touchstart="onTouchStart" 
       @touchmove="onTouchMove" 
       @touchend="onTouchEnd"
       @touchcancel="onTouchEnd">
       
    <div class="swipe-background left-bg" v-if="currentX > 0" :style="{ background: leftBgColor || 'var(--color-success)' }">
      <slot name="left-action" />
    </div>
    
    <div class="swipe-background right-bg" v-if="currentX < 0" :style="{ background: rightBgColor || 'var(--color-error)' }">
      <slot name="right-action" />
    </div>

    <div class="swipe-content" 
         :class="{ 'is-dragging': isDragging }" 
         :style="{ transform: `translateX(${currentX}px)` }">
      <slot />
    </div>
  </div>
</template>

<style scoped lang="scss">
.fp-swipeable {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-md);
  width: 100%;
}

.swipe-background {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  padding: 0 24px;
  color: white;
  width: 100%;
  box-sizing: border-box;
  font-weight: 600;
  z-index: 1;

  &.left-bg {
    left: 0;
    justify-content: flex-start;
  }
  
  &.right-bg {
    right: 0;
    justify-content: flex-end;
  }
}

.swipe-content {
  position: relative;
  z-index: 2;
  background: var(--color-surface);
  transition: transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
  will-change: transform;
  border-radius: inherit;

  &.is-dragging {
    transition: none;
  }
}
</style>
