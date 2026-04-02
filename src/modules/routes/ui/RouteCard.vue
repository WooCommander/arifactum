<script setup lang="ts">
import type { Route } from '../types'
import { MapPin, Star, ChevronRight } from 'lucide-vue-next'

interface Props {
  route: Route
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', id: string): void
}>()
</script>

<template>
  <div class="route-card" @click="emit('click', props.route.id)">
    <div class="route-image">
      <img v-if="props.route.imageUrl" :src="props.route.imageUrl" :alt="props.route.title" />
      <div v-else class="image-placeholder">
        <MapPin :size="48" />
      </div>
      <div class="route-badge" :class="props.route.difficulty">
        {{ props.route.difficulty }}
      </div>
    </div>

    <div class="route-content">
      <h3 class="route-title">{{ props.route.title }}</h3>
      <p class="route-description">{{ props.route.description }}</p>
      
      <div class="route-meta">
        <div class="meta-item">
          <MapPin :size="16" />
          <span>{{ props.route.checkpointsCount }} точек</span>
        </div>
        <div class="meta-item">
          <Star :size="16" class="star-icon" />
          <span>{{ props.route.rating.toFixed(1) }}</span>
        </div>
        <div class="spacer"></div>
        <ChevronRight :size="20" class="arrow-icon" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.route-card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: var(--shadow-1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  cursor: pointer;
  border: 1px solid var(--color-border);

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-2);
  }

  &:active {
    transform: scale(0.98);
  }
}

.route-image {
  height: 160px;
  position: relative;
  background: #f1f5f9;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .image-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-tertiary);
    background: linear-gradient(135deg, var(--color-surface) 0%, #f1f5f9 100%);
  }
}

.route-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 10px;
  border-radius: var(--radius-pill);
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: white;
  backdrop-filter: blur(4px);
  background: rgba(0, 0, 0, 0.4);

  &.easy { background: var(--color-success); }
  &.medium { background: var(--color-warning); }
  &.hard { background: var(--color-error); }
}

.route-content {
  padding: 16px;
}

.route-title {
  font-size: 18px;
  font-weight: 700;
  color: var(--color-text-primary);
  margin-bottom: 4px;
}

.route-description {
  font-size: 14px;
  color: var(--color-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  height: 40px;
  margin-bottom: 12px;
}

.route-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-tertiary);
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.star-icon {
  color: #fbbf24;
  fill: #fbbf24;
}

.spacer {
  flex: 1;
}

.arrow-icon {
  color: var(--color-primary);
}
</style>
