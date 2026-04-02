<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Play, ThumbsUp, Medal } from 'lucide-vue-next'
import { gameService, type CommunityLevel } from '../services/GameService'

const router = useRouter()
const levels = ref<CommunityLevel[]>([])
const isLoading = ref(true)

onMounted(async () => {
    levels.value = await gameService.getCommunityLevels()
    isLoading.value = false
})

const playLevel = (level: CommunityLevel) => {
    // В идеале мы бы передавали ID уровня и FlowGameView его загружал,
    // но для простоты прототипа мы можем сохранить его в localStorage или стейт
    localStorage.setItem('fp_community_play', JSON.stringify(level))
    router.push('/games/flow')
}

</script>

<template>
    <div class="community-hub">
        <header class="app-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <h1 class="page-title">Уровни Сообщества</h1>
            <div style="width: 24px;"></div>
        </header>

        <main class="content-scroll">
            <div v-if="isLoading" class="loading-state">
                Загрузка уровней...
            </div>
            
            <div v-else-if="levels.length === 0" class="empty-state">
                <p>Здесь пока пусто.</p>
                <p>Сыграйте в генерируемые уровни и поделитесь ими первым!</p>
                <button class="primary-btn mt-4" @click="router.push('/games/flow')">Играть</button>
            </div>

            <div v-else class="levels-grid">
                <div v-for="level in levels" :key="level.id" class="level-card">
                    <div class="level-header">
                        <div class="meta" style="font-size: 0.8rem; color: var(--color-text-secondary); margin-bottom: 8px;">
                            <span>Создатель: {{ level.profiles?.display_name || 'Аноним' }}</span><br>
                            <span>Размер: {{ level.size }}x{{ level.size }}</span>
                        </div>
                    </div>
                    
                    <div class="level-preview" :style="{ gridTemplateColumns: `repeat(${level.size}, 1fr)` }">
                        <div v-for="r in level.size" :key="'r'+r" style="display: contents;">
                            <div v-for="c in level.size" :key="'c'+c" class="preview-cell">
                                <div v-for="dot in level.dots" :key="'d'+dot.r+dot.c" 
                                     v-show="dot.r === r-1 && dot.c === c-1"
                                     class="preview-dot"
                                     :style="{ backgroundColor: dot.color }">
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="level-actions">
                        <button class="play-btn" @click="playLevel(level)">
                            <Play :size="18" style="margin-right: 8px;" />
                            Играть
                        </button>
                        
                        <div class="stats">
                            <div class="stat"><Medal :size="16" /> Рекорды</div>
                            <div class="stat" v-if="level.likes > 0"><ThumbsUp :size="16" /> {{ level.likes }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</template>

<style scoped>
.community-hub {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--color-background);
}

.content-scroll {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-md);
}

.levels-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    padding-bottom: 100px;
}

.level-card {
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    padding: var(--spacing-md);
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

.level-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: var(--spacing-md);
    
    .size-badge {
        background: var(--color-primary);
        color: white;
        padding: 4px 10px;
        border-radius: 99px;
        font-weight: 800;
        font-size: 0.9rem;
    }
    
    .author {
        color: var(--color-text-secondary);
        font-size: 0.9rem;
    }
}

.level-preview {
    display: grid;
    aspect-ratio: 1;
    background: color-mix(in srgb, var(--color-background) 50%, #000);
    border-radius: var(--radius-md);
    padding: 8px;
    gap: 2px;
    margin-bottom: var(--spacing-md);
}

.preview-cell {
    background: rgba(255,255,255,0.05);
    border-radius: 2px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.preview-dot {
    width: 70%;
    height: 70%;
    border-radius: 50%;
}

.level-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.play-btn {
    display: flex;
    align-items: center;
    background: var(--color-success);
    color: white;
    border: none;
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-weight: 700;
    cursor: pointer;
}

.stats {
    display: flex;
    gap: 12px;
    color: var(--color-text-secondary);
    font-size: 0.9rem;
    
    .stat {
        display: flex;
        align-items: center;
        gap: 4px;
    }
}

.empty-state, .loading-state {
    text-align: center;
    padding: var(--spacing-xl) 0;
    color: var(--color-text-secondary);
}
</style>
