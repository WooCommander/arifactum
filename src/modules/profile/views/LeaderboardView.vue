<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { LeaderboardService, type LeaderboardCategory, type LeaderboardEntry } from '../services/LeaderboardService'
import FpCard from '@/design-system/components/FpCard.vue'
import { FpSkeleton } from '@/design-system'

const categories: { key: LeaderboardCategory; label: string; unit: string; icon: string }[] = [
    { key: 'reputation', label: 'Репутация', unit: 'очков', icon: '🏆' },
    { key: 'games', label: 'Игры', unit: 'pts', icon: '🎮' },
    { key: 'products', label: 'Товары', unit: 'товаров', icon: '📦' },
    { key: 'prices', label: 'Цены', unit: 'цен', icon: '💰' },
]

const LEVEL_COLORS: Record<number, string> = {
    1: 'var(--color-level-1)',
    2: 'var(--color-level-2)',
    3: 'var(--color-level-3)',
    4: 'var(--color-level-4)',
    5: 'var(--color-level-5)',
}

const activeCategory = ref<LeaderboardCategory>('reputation')
const entries = ref<LeaderboardEntry[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

async function load() {
    isLoading.value = true
    error.value = null
    try {
        entries.value = await LeaderboardService.getLeaderboard(activeCategory.value)
    } catch (e: any) {
        error.value = 'Не удалось загрузить рейтинг'
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

watch(activeCategory, load)
onMounted(load)
</script>

<template>
    <div class="leaderboard-view">
        <div class="page-title-row">
            <h1 class="page-title">Рейтинг</h1>
        </div>

        <div class="category-tabs">
            <button v-for="cat in categories" :key="cat.key" class="tab-btn"
                :class="{ active: activeCategory === cat.key }" @click="activeCategory = cat.key">
                <span class="tab-icon">{{ cat.icon }}</span>
                {{ cat.label }}
            </button>
        </div>

        <div v-if="isLoading" class="entries-list" style="margin-top: 24px;">
            <FpCard v-for="i in 5" :key="i" class="entry-card" style="display: flex; gap: 12px; align-items: center;">
                <FpSkeleton width="36px" height="24px" />
                <div style="flex: 1;">
                    <FpSkeleton width="40%" height="16px" style="margin-bottom: 4px;" />
                    <FpSkeleton width="20%" height="12px" />
                </div>
                <div style="display: flex; flex-direction: column; align-items: flex-end;">
                    <FpSkeleton width="50px" height="18px" style="margin-bottom: 4px;" />
                    <FpSkeleton width="30px" height="12px" />
                </div>
            </FpCard>
        </div>

        <div v-else-if="error" class="empty-state">{{ error }}</div>

        <div v-else-if="entries.length === 0" class="empty-state">Пока нет данных</div>

        <div v-else class="entries-list">
            <FpCard v-for="entry in entries" :key="entry.userId" class="entry-card"
                :class="{ 'is-me': entry.isCurrentUser, 'is-podium': entry.rank <= 3 }">

                <!-- Rank -->
                <div class="entry-rank">
                    <span v-if="entry.rank <= 3" class="medal">{{ MEDAL[entry.rank] }}</span>
                    <span v-else class="rank-num">#{{ entry.rank }}</span>
                </div>

                <!-- Info -->
                <div class="entry-info">
                    <div class="entry-name-row">
                        <span class="entry-name" :class="{ 'me-label': entry.isCurrentUser }" :title="entry.displayName">
                            {{ entry.displayName }}
                        </span>
                        <span class="level-badge" :style="{ color: LEVEL_COLORS[entry.level] }">
                            Lvl {{ entry.level }} · {{ entry.levelTitle }}
                        </span>
                    </div>
                    <div class="entry-sub">
                        <span>📦 {{ entry.productsCount }}</span>
                        <span>💰 {{ entry.pricesCount }}</span>
                    </div>
                </div>

                <!-- Score -->
                <div class="entry-score">
                    <span class="score-value">{{ entry.score.toLocaleString('ru-RU') }}</span>
                    <span class="score-unit">{{categories.find(c => c.key === activeCategory)?.unit}}</span>
                </div>
            </FpCard>
        </div>
    </div>
</template>

<style scoped lang="scss">
.leaderboard-view {
    padding: 0 var(--spacing-sm);
}

.category-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: var(--spacing-md);
    overflow-x: auto;
    padding-bottom: 2px;
}

.tab-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 16px;
    border: 1.5px solid var(--color-border);
    border-radius: 20px;
    background: var(--color-surface);
    font-size: 14px;
    font-weight: 500;
    color: var(--color-text-secondary);
    cursor: pointer;
    white-space: nowrap;
    transition: all 0.2s;

    &.active {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, transparent);
        color: var(--color-primary);
    }

    .tab-icon {
        font-size: 16px;
    }
}

.loading-state,
.empty-state {
    display: flex;
    justify-content: center;
    padding: 40px;
    color: var(--color-text-secondary);
}

.entries-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.entry-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    ;

    &.is-me {
        border: 1.5px solid var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    }
}

.entry-rank {
    width: 36px;
    text-align: center;
    flex-shrink: 0;

    .medal {
        font-size: 24px;
    }

    .rank-num {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-secondary);
    }
}

.entry-info {
    flex: 1;
    min-width: 0;
}

.entry-name-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
}

.entry-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--color-text-primary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;

    &.me-label {
        color: var(--color-primary);
    }
}

.level-badge {
    font-size: 11px;
    font-weight: 500;
    white-space: nowrap;
}

.entry-sub {
    display: flex;
    gap: 10px;
    margin-top: 2px;
    font-size: 12px;
    color: var(--color-text-secondary);
}

.entry-score {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    flex-shrink: 0;

    .score-value {
        font-size: 16px;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .score-unit {
        font-size: 11px;
        color: var(--color-text-secondary);
    }
}
</style>
