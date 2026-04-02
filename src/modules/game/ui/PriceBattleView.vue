<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { CatalogService, type ProductDTO } from '@/modules/catalog/services/CatalogService'
import { FpHaptics } from '@/shared/lib/haptics'
import { ArrowLeft, TrendingUp, TrendingDown, RefreshCcw, Heart, Zap } from 'lucide-vue-next'
import confetti from 'canvas-confetti'

const router = useRouter()

const isLoading = ref(true)
const products = ref<ProductDTO[]>([])
const score = ref(0)
const bestScore = ref(0)
const lives = ref(3) // <-- Added 3 lives
const isGameOver = ref(false)

const productA = ref<ProductDTO | null>(null)
const productB = ref<ProductDTO | null>(null)

// Game states: 'playing', 'reveal'
const gameState = ref<'playing' | 'reveal'>('playing')
const lastGuess = ref<'correct' | 'wrong' | null>(null)

// Quick answer tracking
const roundStartTime = ref(0)
const showBonus = ref(false)

const loadProducts = async () => {
    try {
        isLoading.value = true
        const res = await CatalogService.searchProducts('', {}, 1, 100)
        products.value = res.items.filter(p => p.normalizedPrice || p.lastPrice)

        if (products.value.length < 2) {
            isGameOver.value = true
        } else {
            startRound()
        }
    } catch (e) {
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

const getRandomProduct = (excludeId?: string) => {
    let list = products.value
    if (excludeId) {
        list = list.filter(p => p.id !== excludeId)
    }
    const idx = Math.floor(Math.random() * list.length)
    return list[idx]
}

const startRound = () => {
    gameState.value = 'playing'
    lastGuess.value = null
    showBonus.value = false

    if (!productA.value || isGameOver.value) {
        productA.value = getRandomProduct()
    } else {
        productA.value = productB.value
    }
    productB.value = getRandomProduct(productA.value?.id)

    roundStartTime.value = Date.now()
}

const getPriceValue = (p: ProductDTO) => {
    return p.normalizedPrice || p.lastPrice || 0
}

const handleGuess = (guess: 'higher' | 'lower') => {
    if (gameState.value !== 'playing' || !productA.value || !productB.value) return

    const priceA = getPriceValue(productA.value)
    const priceB = getPriceValue(productB.value)
    const timeTaken = Date.now() - roundStartTime.value

    let isCorrect = false
    if (guess === 'higher' && priceB >= priceA) isCorrect = true
    if (guess === 'lower' && priceB <= priceA) isCorrect = true
    if (priceA === priceB) isCorrect = true

    gameState.value = 'reveal'

    if (isCorrect) {
        lastGuess.value = 'correct'

        let pointsAdded = 1
        if (timeTaken < 2500) { // Fast answer! Under 2.5 seconds
            pointsAdded = 3
            showBonus.value = true
        }

        score.value += pointsAdded
        if (score.value > bestScore.value) {
            bestScore.value = score.value
            localStorage.setItem('fp_game_best_score', score.value.toString())
        }
        FpHaptics.success()

        if (score.value % 10 === 0 || score.value % 10 === 1 || score.value % 10 === 2) {
            // Celebrate around multiples of 10
            if (Math.random() > 0.5) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
        }

        setTimeout(() => startRound(), 1500)
    } else {
        lastGuess.value = 'wrong'
        FpHaptics.error()
        lives.value -= 1

        if (lives.value <= 0) {
            isGameOver.value = true
        } else {
            // Still have lives, start next round after reveal!
            setTimeout(() => startRound(), 2500)
        }
    }
}

const restartGame = () => {
    score.value = 0
    lives.value = 3
    isGameOver.value = false
    startRound()
}

onMounted(() => {
    const savedBest = localStorage.getItem('fp_game_best_score')
    if (savedBest) bestScore.value = parseInt(savedBest, 10)
    loadProducts()
})

const formatPrice = (value: number) => {
    return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB' }).format(value)
}

const getUnitDisplay = (p: ProductDTO) => {
    if (p.unit === 'шт') return '1 шт'
    if (p.unit === 'кг') return '1 кг'
    if (p.unit === 'л') return '1 л'
    return p.unit
}
</script>

<template>
    <div class="game-view">
        <header class="game-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <div class="lives-indicator">
                <Heart v-for="n in 3" :key="n" :size="20" :class="{ 'lost': n > lives }" class="heart" />
            </div>
            <div class="score-board">
                <div class="score-badge current">Счет: {{ score }}
                    <Zap v-if="showBonus" :size="14" class="bonus-icon" />
                </div>
            </div>
        </header>

        <div v-if="isLoading" class="loading-state">
            <RefreshCcw class="spin-icon" :size="32" />
            <p>Загрузка товаров...</p>
        </div>

        <div v-else-if="products.length < 2 && !isLoading" class="error-state">
            <h2>Мало данных</h2>
            <p>Необходимо добавить хотя бы 2 товара с ценами в каталог, чтобы начать игру.</p>
        </div>

        <div v-else class="game-board">
            <!-- Product A -->
            <transition name="slide-card">
                <div v-if="productA" class="product-card card-a" :key="'a-' + productA.id">
                    <div class="card-content">
                        <h3 class="product-name">{{ productA.name }}</h3>
                        <p class="product-store" v-if="productA.lastStore">{{ productA.lastStore }}</p>

                        <div class="price-reveal">
                            <span class="price-value">{{ formatPrice(getPriceValue(productA)) }}</span>
                            <span class="price-unit">за {{ getUnitDisplay(productA) }}</span>
                        </div>
                    </div>
                </div>
            </transition>

            <div class="vs-badge">VS</div>

            <!-- Product B -->
            <transition name="slide-card">
                <div v-if="productB" class="product-card card-b" :key="'b-' + productB.id">
                    <div class="card-content">
                        <h3 class="product-name">{{ productB.name }}</h3>
                        <p class="product-store" v-if="productB.lastStore">{{ productB.lastStore }}</p>

                        <div class="price-reveal" v-if="gameState === 'reveal'">
                            <span class="price-value"
                                :class="{ 'text-success': lastGuess === 'correct', 'text-error': lastGuess === 'wrong' }">
                                {{ formatPrice(getPriceValue(productB)) }}
                            </span>
                            <span class="price-unit">за {{ getUnitDisplay(productB) }}</span>

                            <div v-if="showBonus && lastGuess === 'correct'" class="bonus-text">
                                +Скорость! ⚡
                            </div>
                        </div>
                        <div class="price-hidden" v-else>
                            <span class="question-mark">?</span>
                        </div>
                    </div>

                    <div class="action-buttons" v-if="gameState === 'playing' && !isGameOver">
                        <button class="guess-btn higher" @click="handleGuess('higher')">
                            <TrendingUp :size="24" />
                            <span>Дороже</span>
                        </button>
                        <button class="guess-btn lower" @click="handleGuess('lower')">
                            <TrendingDown :size="24" />
                            <span>Дешевле</span>
                        </button>
                    </div>
                </div>
            </transition>
        </div>

        <!-- Game Over Modal -->
        <transition name="fade">
            <div v-if="isGameOver && products.length >= 2" class="game-over-overlay">
                <div class="game-over-card">
                    <h2 class="title text-error">Игра окончена!</h2>
                    <p class="result-text">
                        У вас закончились жизни. Вы набрали отличный результат!
                    </p>
                    <div class="final-score">Ваш счет: <strong>{{ score }}</strong> (Рекорд: {{ bestScore }})</div>

                    <button class="game-btn primary" @click="restartGame">
                        Сыграть еще раз
                    </button>
                </div>
            </div>
        </transition>

    </div>
</template>

<style scoped lang="scss">
.game-view {
    display: flex;
    flex-direction: column;
    height: calc(100dvh - 150px);
    max-height: calc(100dvh - 150px);
    position: relative;
    padding: var(--spacing-sm) var(--spacing-md);
    background-color: var(--color-background);
    background-image: radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 10%, transparent), transparent);
    overflow: hidden;
    touch-action: none;
}

.game-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    z-index: 10;
}

.lives-indicator {
    display: flex;
    gap: 6px;
    align-items: center;

    .heart {
        color: #f43f5e;
        fill: #f43f5e;
        transition: all 0.3s;

        &.lost {
            fill: transparent;
            color: var(--color-border);
            opacity: 0.5;
            transform: scale(0.8);
        }
    }
}

.icon-btn {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
    padding: 8px;
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s ease;

    &:hover {
        background: var(--color-surface-hover);
    }
}

.score-board {
    display: flex;
    gap: 8px;

    .score-badge {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 6px 12px;
        border-radius: 99px;
        font-weight: 800;
        font-size: 0.9rem;

        &.current {
            background: var(--color-primary);
            color: var(--color-on-primary);
        }
    }
}

.bonus-icon {
    color: #fef08a;
    fill: #fef08a;
    animation: flash 1s infinite alternate;
}

@keyframes flash {
    0% {
        opacity: 0.5;
        transform: scale(0.9);
    }

    100% {
        opacity: 1;
        transform: scale(1.2);
    }
}

.game-board {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
    position: relative;
    max-width: 500px;
    margin: 0 auto;
    width: 100%;
}

.vs-badge {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--color-background);
    color: var(--color-text-primary);
    width: 36px;
    height: 36px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 0.9rem;
    z-index: 5;
    border: 2px solid var(--color-border);
    box-shadow: var(--shadow-md);
}

.product-card {
    flex: 1;
    display: flex;
    flex-direction: column;
    background: var(--color-surface);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-md);
    padding: var(--spacing-md);
    align-items: center;
    justify-content: center;
    text-align: center;
    position: relative;
    overflow: hidden;

    &.card-a {
        background: linear-gradient(135deg, var(--color-surface), color-mix(in srgb, var(--color-primary) 5%, transparent));
    }

    &.card-b {
        background: linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 5%, transparent), var(--color-surface));
    }
}

.card-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    flex: 1;
    justify-content: center;
    width: 100%;
}

.product-name {
    font-size: 1.25rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin: 0;
    line-height: 1.2;
}

.product-store {
    font-size: 0.85rem;
    color: var(--color-text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 700;
    margin: 4px 0;
}

.price-reveal {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);

    .price-value {
        font-size: 2rem;
        font-weight: 900;
        letter-spacing: -0.02em;
        line-height: 1;
        transition: color 0.3s;
    }

    .price-unit {
        font-size: 0.9rem;
        color: var(--color-text-tertiary);
        margin-top: 2px;
        font-weight: 500;
    }
}

.bonus-text {
    color: #eab308;
    font-weight: 800;
    font-size: 0.85rem;
    margin-top: 4px;
    animation: slideUpFade 0.5s ease-out;
}

@keyframes slideUpFade {
    0% {
        opacity: 0;
        transform: translateY(10px);
    }

    100% {
        opacity: 1;
        transform: translateY(0);
    }
}

.price-hidden {
    margin-top: 8px;
    width: 60px;
    height: 60px;
    background: var(--color-background);
    border: 2px dashed var(--color-border);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;

    .question-mark {
        font-size: 1.8rem;
        font-weight: 900;
        color: var(--color-text-tertiary);
    }
}

.action-buttons {
    display: flex;
    gap: var(--spacing-sm);
    width: 100%;
    margin-top: 8px;
}

.guess-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 8px;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    font-weight: 800;
    font-size: 0.95rem;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    color: white;

    &.higher {
        background: linear-gradient(135deg, var(--color-error), #fb7185);
        box-shadow: 0 4px 12px color-mix(in srgb, var(--color-error) 40%, transparent);

        &:hover,
        &:active {
            transform: translateY(-2px);
            box-shadow: 0 6px 16px color-mix(in srgb, var(--color-error) 60%, transparent);
        }
    }

    &.lower {
        background: linear-gradient(135deg, var(--color-success), #34d399);
        box-shadow: 0 4px 12px color-mix(in srgb, var(--color-success) 40%, transparent);

        &:hover,
        &:active {
            transform: translateY(2px);
            box-shadow: 0 6px 16px color-mix(in srgb, var(--color-success) 60%, transparent);
        }
    }

    &:active {
        transform: scale(0.96);
    }
}

.game-over-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, var(--color-background) 80%, transparent);
    backdrop-filter: blur(8px);
    z-index: 100;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--spacing-lg);
}

.game-over-card {
    background: var(--color-surface);
    padding: var(--spacing-xl);
    border-radius: var(--radius-lg);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-xl);
    text-align: center;
    max-width: 400px;
    width: 100%;

    .title {
        font-size: 2rem;
        font-weight: 900;
        margin-bottom: var(--spacing-md);
    }

    .result-text {
        font-size: 1.1rem;
        color: var(--color-text-secondary);
        margin-bottom: var(--spacing-md);
        line-height: 1.5;
    }

    .final-score {
        font-size: 1.25rem;
        color: var(--color-text-primary);
        margin-bottom: var(--spacing-xl);
        padding: 12px;
        background: var(--color-background);
        border-radius: var(--radius-sm);
    }
}

.game-btn {
    width: 100%;
    padding: 16px;
    border-radius: var(--radius-md);
    font-weight: 700;
    font-size: 1.1rem;
    border: none;
    cursor: pointer;
    transition: all 0.2s;

    &.primary {
        background: var(--color-primary);
        color: var(--color-on-primary);

        &:hover {
            transform: translateY(-2px);
            box-shadow: var(--shadow-md);
        }

        &:active {
            transform: translateY(0);
        }
    }
}

.loading-state,
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    color: var(--color-text-tertiary);
    gap: var(--spacing-md);
    text-align: center;
}

.spin-icon {
    animation: spin 1s linear infinite;
}

@keyframes spin {
    100% {
        transform: rotate(360deg);
    }
}

@keyframes bounceIn {
    0% {
        opacity: 0;
        transform: scale(0.3);
    }

    50% {
        opacity: 1;
        transform: scale(1.05);
    }

    70% {
        transform: scale(0.9);
    }

    100% {
        transform: scale(1);
    }
}

.slide-card-enter-active,
.slide-card-leave-active {
    transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-card-enter-from {
    opacity: 0;
    transform: translateY(30px) scale(0.98);
}

.slide-card-leave-to {
    opacity: 0;
    transform: translateY(-30px) scale(1.02);
}

.text-success {
    color: var(--color-success) !important;
}

.text-error {
    color: var(--color-error) !important;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

::-webkit-scrollbar {
    display: none;
}
</style>
