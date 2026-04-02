<script setup lang="ts">
import { onMounted } from 'vue'
import { useRewardsStore } from '../state/useRewardsStore'
import { FpCard, FpSpinner } from '@/design-system'
import { Shield, Trophy, Star } from 'lucide-vue-next'

const { artifacts, isLoading, fetchRewards } = useRewardsStore()

onMounted(() => {
    fetchRewards()
})
</script>

<template>
  <div class="artifacts-container">
    <div class="section-header">
       <h3>Ваши Артефакты</h3>
       <span class="count">{{ artifacts.length }}</span>
    </div>

    <div v-if="isLoading && !artifacts.length" class="loading-state">
       <FpSpinner size="sm" />
    </div>

    <div v-else-if="!artifacts.length" class="empty-artifacts">
       <p>У вас пока нет артефактов. Пройдите свой первый маршрут!</p>
    </div>

    <div v-else class="artifacts-grid">
       <FpCard v-for="art in artifacts" :key="art.id" class="artifact-card">
          <div class="artifact-icon">
             <Trophy v-if="art.amount > 50" :size="24" />
             <Star v-else :size="24" />
          </div>
          <div class="artifact-info">
             <h4>{{ art.name }}</h4>
             <p>{{ art.description }}</p>
          </div>
       </FpCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.artifacts-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
  }

  .count {
    font-size: 14px;
    font-weight: 700;
    background: var(--color-surface-hover);
    padding: 2px 8px;
    border-radius: 12px;
    color: var(--color-primary);
  }
}

.artifacts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.artifact-card {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(to right, var(--color-surface) 0%, var(--color-background) 100%);
  border-left: 4px solid var(--color-primary);
}

.artifact-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--color-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  box-shadow: var(--shadow-sm);
  flex-shrink: 0;
}

.artifact-info {
  h4 {
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 2px;
  }

  p {
    font-size: 13px;
    color: var(--color-text-secondary);
    margin: 0;
  }
}

.empty-artifacts {
  text-align: center;
  padding: 24px;
  color: var(--color-text-secondary);
  font-size: 14px;
  background: var(--color-surface);
  border-radius: var(--radius-md);
  border: 1px dashed var(--color-border);
}
</style>
