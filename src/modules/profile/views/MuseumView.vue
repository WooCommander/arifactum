<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { MuseumService, type MuseumItem } from '../services/MuseumService'
import { authStore } from '@/modules/auth/store/authStore'
import { FpSpinner, FpCard, FpBackButton, FpButton } from '@/design-system'
import { HelpCircle, Calendar, Sparkles, BookOpen } from 'lucide-vue-next'

const router = useRouter()
const items = ref<MuseumItem[]>([])
const isLoading = ref(true)
const selectedItem = ref<MuseumItem | null>(null)

const stats = computed(() => {
  const total = items.value.length
  const unlocked = items.value.filter(i => i.isUnlocked).length
  return { total, unlocked, percent: total > 0 ? (unlocked / total) * 100 : 0 }
})

async function loadCollection() {
  if (!authStore.currentUserId.value) return
  isLoading.value = true
  try {
    items.value = await MuseumService.getUserCollection(authStore.currentUserId.value)
  } catch (error) {
    console.error('Failed to load collection:', error)
  } finally {
    isLoading.value = false
  }
}

function getRarityColor(rarity: string) {
  switch (rarity) {
    case 'common': return '#94a3b8'
    case 'rare': return '#3b82f6'
    case 'epic': return '#a855f7'
    case 'legendary': return '#eab308'
    default: return '#94a3b8'
  }
}

onMounted(loadCollection)
</script>

<template>
  <div class="museum-view">
    <header class="museum-header">
      <FpBackButton @click="router.push('/profile')" />
      <div class="header-content">
        <h1>Музей Артефактов</h1>
        <p>Ваша коллекция редкостей Artifactum</p>
      </div>
    </header>

    <div class="stats-banner" v-if="!isLoading">
      <div class="stat-progress">
        <div class="progress-info">
          <span>Собрано предметов</span>
          <span>{{ stats.unlocked }} / {{ stats.total }}</span>
        </div>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: stats.percent + '%' }"></div>
        </div>
      </div>
    </div>

    <div v-if="isLoading" class="loader">
      <FpSpinner />
    </div>

    <main v-else class="artifacts-grid">
      <FpCard 
        v-for="item in items" 
        :key="item.id" 
        class="artifact-card"
        :class="[item.rarity, { locked: !item.isUnlocked }]"
        @click="item.isUnlocked && (selectedItem = item)"
      >
        <div class="card-inner">
          <div class="artwork-container">
            <template v-if="item.isUnlocked">
              <img :src="item.imageUrl" :alt="item.name" class="artifact-image" />
              <div class="rarity-glow" :style="{ '--glow-color': getRarityColor(item.rarity) }"></div>
            </template>
            <div v-else class="locked-placeholder">
              <HelpCircle :size="48" />
            </div>
          </div>
          
          <div class="artifact-info">
            <h3 v-if="item.isUnlocked">{{ item.name }}</h3>
            <h3 v-else>???</h3>
            <span class="rarity-badge" :style="{ color: getRarityColor(item.rarity) }">
              {{ item.rarity }}
            </span>
          </div>
        </div>
      </FpCard>
    </main>

    <!-- Detail Modal -->
    <Teleport to="body">
      <div v-if="selectedItem" class="modal-overlay" @click.self="selectedItem = null">
        <FpCard class="detail-modal" :class="selectedItem.rarity">
          <button class="close-btn" @click="selectedItem = null">×</button>
          
          <div class="detail-artwork">
            <img :src="selectedItem.imageUrl" :alt="selectedItem.name" />
            <div class="modal-glow" :style="{ '--glow-color': getRarityColor(selectedItem.rarity) }"></div>
          </div>

          <div class="detail-content">
            <div class="detail-header">
              <div class="rarity-tag" :style="{ background: getRarityColor(selectedItem.rarity) + '22', color: getRarityColor(selectedItem.rarity) }">
                <Sparkles :size="14" />
                {{ selectedItem.rarity.toUpperCase() }}
              </div>
              <h2>{{ selectedItem.name }}</h2>
            </div>

            <div class="lore-section">
              <BookOpen :size="18" />
              <p class="lore-text">"{{ selectedItem.lore }}"</p>
            </div>

            <p class="description">{{ selectedItem.description }}</p>

            <div class="discovery-info" v-if="selectedItem.discoveredAt">
              <Calendar :size="16" />
              <span>Обнаружен {{ new Date(selectedItem.discoveredAt).toLocaleDateString() }}</span>
            </div>
          </div>
          
          <FpButton variant="primary" class="back-btn" @click="selectedItem = null">Закрыть</FpButton>
        </FpCard>
      </div>
    </Teleport>
  </div>
</template>

<style scoped lang="scss">
.museum-view {
  min-height: 100vh;
  padding: 20px;
  background: radial-gradient(circle at top right, #1e1b4b, #0f172a);
  color: white;
  padding-bottom: 100px;
}

.museum-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 32px;
  
  .header-content {
    h1 {
      font-size: 28px;
      font-weight: 900;
      margin: 0;
      background: linear-gradient(to right, #fff, #94a3b8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p {
      color: #94a3b8;
      margin: 4px 0 0;
    }
  }
}

.stats-banner {
  margin-bottom: 32px;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);

  .progress-info {
    display: flex;
    justify-content: space-between;
    font-weight: 700;
    margin-bottom: 12px;
    font-size: 14px;
  }

  .progress-bar {
    height: 8px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
    overflow: hidden;

    .progress-fill {
      height: 100%;
      background: linear-gradient(to right, var(--color-primary), #a855f7);
      box-shadow: 0 0 10px rgba(108, 93, 211, 0.5);
      transition: width 0.5s ease;
    }
  }
}

.artifacts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.artifact-card {
  position: relative;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.05) !important;
  padding: 0 !important;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;

  &:active {
    transform: scale(0.95);
  }

  &.locked {
    opacity: 0.6;
    filter: grayscale(1);
  }

  .artwork-container {
    position: relative;
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.2);
    
    .artifact-image {
      width: 80%;
      height: 80%;
      object-fit: contain;
      z-index: 2;
    }

    .rarity-glow {
      position: absolute;
      width: 40%;
      height: 40%;
      background: var(--glow-color);
      filter: blur(40px);
      opacity: 0.4;
      z-index: 1;
    }

    .locked-placeholder {
      color: rgba(255, 255, 255, 0.1);
    }
  }

  .artifact-info {
    padding: 12px;
    text-align: center;

    h3 {
      font-size: 14px;
      font-weight: 800;
      margin: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .rarity-badge {
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  backdrop-filter: blur(20px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  z-index: 2000;
  animation: fade-in 0.3s ease;
}

.detail-modal {
  width: 100%;
  max-width: 400px;
  padding: 32px 24px !important;
  background: var(--color-surface) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  text-align: center;
  animation: modal-pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

  .close-btn {
    position: absolute;
    top: 16px;
    right: 16px;
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    opacity: 0.5;
  }

  .detail-artwork {
    position: relative;
    margin-bottom: 32px;
    
    img {
      width: 180px;
      height: 180px;
      object-fit: contain;
      z-index: 2;
      position: relative;
    }

    .modal-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100px;
      height: 100px;
      background: var(--glow-color);
      filter: blur(60px);
      opacity: 0.6;
      z-index: 1;
    }
  }

  .detail-header {
    margin-bottom: 24px;

    .rarity-tag {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px;
      border-radius: 99px;
      font-size: 12px;
      font-weight: 900;
      margin-bottom: 12px;
    }

    h2 {
      font-size: 24px;
      font-weight: 900;
      margin: 0;
    }
  }

  .lore-section {
    background: rgba(255, 255, 255, 0.03);
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 24px;
    text-align: center;
    border-left: 2px solid var(--color-primary);

    svg {
      color: var(--color-primary);
      margin-bottom: 8px;
    }

    .lore-text {
      font-style: italic;
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.5;
    }
  }

  .description {
    font-size: 15px;
    line-height: 1.6;
    margin-bottom: 24px;
    color: #cbd5e1;
  }

  .discovery-info {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 12px;
    color: #64748b;
    margin-bottom: 32px;
  }

  .back-btn {
    width: 100%;
  }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes modal-pop {
  from { opacity: 0; transform: translateY(40px) scale(0.9); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.loader {
  display: flex;
  justify-content: center;
  padding: 100px 0;
}
</style>
