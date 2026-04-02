<script setup lang="ts">
import FpCard from '@/design-system/components/FpCard.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import { changelog } from '@/data/changelog'

const releases = changelog
</script>

<template>
  <div class="changelog-view">
    <header class="header">
      <div>
        <p class="eyebrow">Версии</p>
        <h1>История изменений</h1>
        <p class="subtitle">Что нового, какие баги исправлены и что добавлено в каждой версии.</p>
      </div>
      <FpButton size="sm" variant="secondary" @click="$router.back()">Назад</FpButton>
    </header>

    <div class="timeline">
      <FpCard v-for="rel in releases" :key="rel.version" class="release-card" padding="lg">
        <div class="release-header">
          <div class="title">
            <span class="version">v{{ rel.version }}</span>
            <span class="dot">•</span>
            <span class="date">{{ rel.date }}</span>
          </div>
        </div>

        <div class="pill-row" v-if="rel.highlights?.length">
          <span v-for="(h, i) in rel.highlights" :key="i" class="pill">{{ h }}</span>
        </div>

        <div class="grid">
          <div v-if="rel.features?.length" class="column">
            <h3>Новые функции</h3>
            <ul>
              <li v-for="(item, i) in rel.features" :key="i">{{ item }}</li>
            </ul>
          </div>
          <div v-if="rel.fixes?.length" class="column">
            <h3>Исправления</h3>
            <ul>
              <li v-for="(item, i) in rel.fixes" :key="i">{{ item }}</li>
            </ul>
          </div>
          <div v-if="rel.notes?.length" class="column">
            <h3>Примечания</h3>
            <ul>
              <li v-for="(item, i) in rel.notes" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>
      </FpCard>
    </div>
  </div>
</template>

<style scoped lang="scss">
.changelog-view {
  padding: var(--spacing-lg) var(--spacing-sm);
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--spacing-md);
  flex-wrap: wrap;

  h1 {
    margin: 4px 0;
    font-size: var(--text-h3);
  }

  .subtitle {
    margin: 0;
    color: var(--color-text-secondary);
  }

  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 12px;
    color: var(--color-text-tertiary);
    margin: 0;
  }
}

.timeline {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-md);
}

.release-card {
  position: relative;
  border: 1px solid var(--color-border);

  .release-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 700;
    color: var(--color-text-primary);

    .version {
      font-size: 18px;
    }

    .dot {
      color: var(--color-text-tertiary);
    }

    .date {
      color: var(--color-text-secondary);
      font-size: 14px;
    }
  }
}

.pill-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.pill {
  background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  color: var(--color-primary);
  padding: 6px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: var(--spacing-md);
}

.column h3 {
  margin: 0 0 8px 0;
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-secondary);
}

.column ul {
  margin: 0;
  padding-left: 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
</style>
