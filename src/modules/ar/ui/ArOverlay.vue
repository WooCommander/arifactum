<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import artifactImg from '@/assets/images/artifact.png'
import { Haptics } from '@capacitor/haptics'

const emit = defineEmits<{
  (e: 'capture'): void
  (e: 'close'): void
}>()

const tiltX = ref(0)
const tiltY = ref(0)
const isCapturing = ref(false)

const handleOrientation = (event: DeviceOrientationEvent) => {
  if (event.beta !== null && event.gamma !== null) {
    // Basic tilt mapping
    tiltX.value = (event.gamma / 45) * 20 // Move up to 20px
    tiltY.value = (event.beta / 45) * 20
  }
}

const onCapture = async () => {
  if (isCapturing.value) return
  isCapturing.value = true
  
  await Haptics.vibrate()
  
  setTimeout(() => {
    emit('capture')
  }, 800)
}

onMounted(() => {
  window.addEventListener('deviceorientation', handleOrientation)
})

onUnmounted(() => {
  window.removeEventListener('deviceorientation', handleOrientation)
})
</script>

<template>
  <div class="ar-overlay">
    <!-- Camera Viewport (conceptual, actually happens below) -->
    
    <div class="target-container" :style="{ transform: `translate(${tiltX}px, ${tiltY}px)` }">
      <div class="artifact-glow" :class="{ 'capturing': isCapturing }"></div>
      <img 
        :src="artifactImg" 
        class="artifact-model" 
        :class="{ 'capturing': isCapturing }"
        @click="onCapture"
      />
      
      <div v-if="!isCapturing" class="scan-ring"></div>
    </div>

    <div class="ar-hud">
      <div class="ar-hint">Найдите артефакт и коснитесь его</div>
      <button class="btn-close" @click="emit('close')">Выйти из AR</button>
    </div>

    <div v-if="isCapturing" class="capture-flash"></div>
  </div>
</template>

<style scoped lang="scss">
.ar-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: transparent;
  color: white;
}

.target-container {
  position: relative;
  width: 250px;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
  transition: transform 0.1s ease-out;
}

.artifact-model {
  width: 180px;
  height: 180px;
  object-fit: contain;
  animation: float 4s ease-in-out infinite;
  filter: drop-shadow(0 0 15px rgba(66, 133, 244, 0.6));
  cursor: pointer;
  z-index: 2;
  
  &.capturing {
    animation: absorb 0.8s ease-in forwards;
  }
}

.artifact-glow {
  position: absolute;
  width: 120px;
  height: 120px;
  background: radial-gradient(circle, var(--color-primary) 0%, transparent 70%);
  opacity: 0.5;
  filter: blur(20px);
  animation: pulse 2s ease-in-out infinite;
  
  &.capturing {
    animation: none;
    transform: scale(3);
    opacity: 0;
    transition: all 0.5s ease-out;
  }
}

.scan-ring {
  position: absolute;
  inset: 0;
  border: 2px dashed rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  animation: rotate 10s linear infinite;
}

.ar-hud {
  position: absolute;
  bottom: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  pointer-events: auto;
}

.ar-hint {
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-size: 13px;
}

.btn-close {
  background: rgba(0, 0, 0, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  padding: 10px 24px;
  border-radius: 20px;
  font-weight: 600;
  backdrop-filter: blur(10px);
}

.capture-flash {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 10001;
  animation: flash 0.8s ease-out forwards;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-20px); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.5); opacity: 0.8; }
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes absorb {
  0% { transform: scale(1) rotate(0); opacity: 1; filter: brightness(1); }
  100% { transform: scale(0) rotate(720deg); opacity: 0; filter: brightness(5); }
}

@keyframes flash {
  0% { opacity: 0; }
  20% { opacity: 1; }
  100% { opacity: 0; }
}
</style>
