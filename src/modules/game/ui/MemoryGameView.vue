<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, Brain, Timer, Trophy, RotateCcw } from 'lucide-vue-next'
import { CatalogService } from '@/modules/catalog/services/CatalogService'
import { gameService } from '../services/GameService'
import { FpHaptics } from '@/shared/lib/haptics'
import { FpButton, FpCard } from '@/design-system'

const router = useRouter()

type Difficulty = 'easy' | 'medium' | 'hard'

interface GameConfig {
    rows: number
    cols: number
    time: number
    multiplier: number
}

const CONFIGS: Record<Difficulty, GameConfig> = {
    easy: { rows: 3, cols: 4, time: 60, multiplier: 1 },
    medium: { rows: 4, cols: 4, time: 45, multiplier: 1.5 },
    hard: { rows: 4, cols: 5, time: 30, multiplier: 2.5 }
}

interface Card {
    id: string
    productId: string
    name: string
    image: string | null
    isFlipped: boolean
    isMatched: boolean
}

// Game State
const gameState = ref<'selection' | 'playing' | 'won' | 'lost'>('selection')
const difficulty = ref<Difficulty>('easy')
const cards = ref<Card[]>([])
const flippedCards = ref<Card[]>([])
const timer = ref(0)
const score = ref(0)
const isLoading = ref(false)
let timerInterval: any = null

const startGame = async (level: Difficulty) => {
    difficulty.value = level
    isLoading.value = true
    gameState.value = 'playing'
    
    const config = CONFIGS[level]
    const pairCount = (config.rows * config.cols) / 2
    
    try {
        const products = await CatalogService.getRandomProductsForGame(pairCount)
        
        // Create pairs
        const gameCards: Card[] = []
        products.forEach((p, idx) => {
            const cardBase = {
                productId: p.id,
                name: p.name,
                image: p.image_url || null,
                isFlipped: false,
                isMatched: false
            }
            // Add two copies
            gameCards.push({ ...cardBase, id: `${idx}-a` })
            gameCards.push({ ...cardBase, id: `${idx}-b` })
        })
        
        // Shuffle
        cards.value = gameCards.sort(() => Math.random() - 0.5)
        
        // Reset metrics
        timer.value = config.time
        score.value = 0
        flippedCards.value = []
        
        startTimer()
    } catch (e) {
        console.error(e)
        gameState.value = 'selection'
    } finally {
        isLoading.value = false
    }
}

const startTimer = () => {
    clearInterval(timerInterval)
    timerInterval = setInterval(() => {
        timer.value--
        if (timer.value <= 0) {
            endGame(false)
        }
    }, 1000)
}

const handleCardClick = (card: Card) => {
    if (gameState.value !== 'playing' || card.isFlipped || card.isMatched || flippedCards.value.length === 2) return

    card.isFlipped = true
    flippedCards.value.push(card)
    FpHaptics.light()

    if (flippedCards.value.length === 2) {
        checkMatch()
    }
}

const checkMatch = () => {
    const [c1, c2] = flippedCards.value
    
    if (c1.productId === c2.productId) {
        // Match!
        setTimeout(() => {
            c1.isMatched = true
            c2.isMatched = true
            flippedCards.value = []
            FpHaptics.success()
            
            if (cards.value.every(c => c.isMatched)) {
                endGame(true)
            }
        }, 500)
    } else {
        // No match
        setTimeout(() => {
            c1.isFlipped = false
            c2.isFlipped = false
            flippedCards.value = []
        }, 1000)
    }
}

const endGame = async (won: boolean) => {
    clearInterval(timerInterval)
    
    if (won) {
        gameState.value = 'won'
        const config = CONFIGS[difficulty.value]
        const timeBonus = Math.floor(timer.value * config.multiplier * 10)
        const baseScore = (config.rows * config.cols) * 50
        score.value = baseScore + timeBonus
        
        FpHaptics.success()
        
        // Save to DB
        await gameService.saveGameScore({
            game_type: 'memory',
            score: score.value,
            difficulty: difficulty.value
        })
    } else {
        gameState.value = 'lost'
        FpHaptics.error()
    }
}

onUnmounted(() => {
    clearInterval(timerInterval)
})

const gridStyle = computed(() => {
    const config = CONFIGS[difficulty.value]
    return {
        gridTemplateColumns: `repeat(${config.cols}, 1fr)`,
        gridTemplateRows: `repeat(${config.rows}, 1fr)`
    }
})
</script>

<template>
    <div class="memory-game">
        <header class="game-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <div class="header-content">
                <h1 class="title">Мэмори</h1>
                <div v-if="gameState === 'playing'" class="timer-box" :class="{ 'low-time': timer < 10 }">
                    <Timer :size="18" />
                    <span>{{ timer }}с</span>
                </div>
            </div>
        </header>

        <!-- SELECTION SCREEN -->
        <div v-if="gameState === 'selection'" class="selection-screen">
            <div class="hero-icon">
                <Brain :size="64" />
            </div>
            <h2>Выберите сложность</h2>
            <div class="difficulty-options">
                <FpCard class="diff-card" @click="startGame('easy')">
                    <div class="diff-title">Легко</div>
                    <div class="diff-desc">3x4 (12 карт) · 60 сек</div>
                </FpCard>
                <FpCard class="diff-card" @click="startGame('medium')">
                    <div class="diff-title">Средне</div>
                    <div class="diff-desc">4x4 (16 карт) · 45 сек</div>
                </FpCard>
                <FpCard class="diff-card" @click="startGame('hard')">
                    <div class="diff-title">Сложно</div>
                    <div class="diff-desc">4x5 (20 карт) · 30 сек</div>
                </FpCard>
            </div>
        </div>

        <!-- PLAYING SCREEN -->
        <div v-else-if="gameState === 'playing'" class="game-board-v">
            <div class="grid-container" :style="gridStyle">
                <div v-for="card in cards" :key="card.id" class="card-flip-wrap" 
                     :class="{ 'is-flipped': card.isFlipped || card.isMatched, 'is-hidden': card.isMatched }"
                     @click="handleCardClick(card)">
                    <div class="card-inner">
                        <div class="card-front">
                            <span>FP</span>
                        </div>
                        <div class="card-back">
                            <img v-if="card.image" :src="card.image" :alt="card.name" class="product-img" />
                            <div v-else class="text-fallback">{{ card.name }}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- RESULTS SCREEN -->
        <div v-else-if="gameState === 'won' || gameState === 'lost'" class="result-screen">
            <div class="result-card">
                <div v-if="gameState === 'won'" class="win-state">
                    <Trophy :size="80" class="win-icon" />
                    <h2>Победа!</h2>
                    <div class="score-display">
                        <span class="label">Вы набрали:</span>
                        <span class="value">{{ score }} pts</span>
                    </div>
                </div>
                <div v-else class="lose-state">
                    <div class="lose-icon">⌛</div>
                    <h2>Время вышло</h2>
                    <p>Попробуйте еще раз!</p>
                </div>
                
                <div class="result-actions">
                    <FpButton width="full" @click="gameState = 'selection'">
                        Играть снова <RotateCcw :size="18" class="ml-2" />
                    </FpButton>
                    <FpButton variant="text" width="full" @click="router.back()">
                        К списку игр
                    </FpButton>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.memory-game {
    display: flex;
    flex-direction: column;
    height: 100vh;
    padding: var(--spacing-md);
    background: linear-gradient(135deg, var(--color-background) 0%, color-mix(in srgb, var(--color-primary) 5%, var(--color-background)) 100%);
    overflow: hidden;
}

.game-header {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-bottom: 24px;

    .header-content {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex: 1;
    }

    .title {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0;
    }
}

.icon-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
}

.timer-box {
    display: flex;
    align-items: center;
    gap: 6px;
    background: var(--color-surface);
    padding: 6px 12px;
    border-radius: 20px;
    border: 1.5px solid var(--color-border);
    font-weight: 700;
    color: var(--color-text-primary);
    
    &.low-time {
        border-color: var(--color-error);
        color: var(--color-error);
        animation: pulse 1s infinite;
    }
}

@keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

/* Selection */
.selection-screen {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 16px;

    .hero-icon {
        color: var(--color-primary);
        margin-bottom: 8px;
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 800;
    }
}

.difficulty-options {
    width: 100%;
    max-width: 320px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.diff-card {
    padding: 16px;
    cursor: pointer;
    transition: all 0.2s;
    border: 1.5px solid var(--color-border);

    &:hover {
        border-color: var(--color-primary);
        transform: translateY(-2px);
    }

    .diff-title {
        font-size: 1.1rem;
        font-weight: 700;
        margin-bottom: 4px;
    }
    .diff-desc {
        font-size: 0.85rem;
        color: var(--color-text-secondary);
    }
}

/* Game Board */
.game-board-v {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
}

.grid-container {
    display: grid;
    gap: 10px;
    width: 100%;
    max-width: 400px;
    aspect-ratio: 1/1.2;
}

.card-flip-wrap {
    perspective: 1000px;
    cursor: pointer;
    height: 100%;

    &.is-flipped .card-inner {
        transform: rotateY(180deg);
    }
    
    &.is-hidden {
        opacity: 0.6; // Keep matched but dim
    }
}

.card-inner {
    position: relative;
    width: 100%;
    height: 100%;
    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
    transform-style: preserve-3d;
}

.card-front, .card-back {
    position: absolute;
    width: 100%;
    height: 100%;
    backface-visibility: hidden;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--color-border);
}

.card-front {
    background: var(--color-primary);
    color: white;
    font-weight: 800;
    font-size: 1.5rem;
}

.card-back {
    background: var(--color-surface);
    transform: rotateY(180deg);
    padding: 8px;
    overflow: hidden;

    .product-img {
        width: 100%;
        height: 100%;
        object-fit: contain;
    }

    .text-fallback {
        font-size: 10px;
        text-align: center;
        font-weight: 600;
        color: var(--color-text-primary);
        line-height: 1.2;
    }
}

/* Result */
.result-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.4);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    z-index: 100;
}

.result-card {
    background: var(--color-surface);
    width: 100%;
    max-width: 320px;
    padding: 32px 24px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 24px;
    box-shadow: var(--shadow-xl);
}

.win-icon {
    color: #f59e0b; // Gold
    filter: drop-shadow(0 0 12px rgba(245, 158, 11, 0.5));
}

.lose-icon {
    font-size: 64px;
}

.score-display {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .label {
        font-size: 0.9rem;
        color: var(--color-text-secondary);
    }
    .value {
        font-size: 2rem;
        font-weight: 800;
        color: var(--color-primary);
    }
}

.result-actions {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.ml-2 {
    margin-left: 8px;
}
</style>
