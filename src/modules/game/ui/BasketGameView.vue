<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft, ShoppingCart, Trophy, RefreshCcw } from 'lucide-vue-next'
import { CatalogService, type ProductDTO } from '@/modules/catalog/services/CatalogService'
import { gameService } from '../services/GameService'
import { FpHaptics } from '@/shared/lib/haptics'
import confetti from 'canvas-confetti'

const router = useRouter()

type GameState = 'setup' | 'loading' | 'playing' | 'result'
type Difficulty = 'easy' | 'medium' | 'hard'

const DIFFICULTIES: Record<Difficulty, { label: string; budget: number; productCount: number; time: number }> = {
    easy:   { label: 'Лёгкий',  budget: 500,  productCount: 8,  time: 90 },
    medium: { label: 'Средний', budget: 900,  productCount: 12, time: 75 },
    hard:   { label: 'Сложный', budget: 1500, productCount: 16, time: 60 },
}

const gameState         = ref<GameState>('setup')
const selectedDiff      = ref<Difficulty>('medium')
const products          = ref<ProductDTO[]>([])
const selected          = ref<Set<string>>(new Set())
const budget            = ref(0)
const timeLeft          = ref(0)
const bestScore         = ref(Number(localStorage.getItem('fp_basket_best') || 0))

let timerInterval: ReturnType<typeof setInterval> | null = null

// ── helpers ────────────────────────────────────────────────
const getPrice = (p: ProductDTO) => p.lastPrice || p.normalizedPrice || 0

const formatPrice = (n: number) =>
    new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(n)

// ── computed ───────────────────────────────────────────────
const total = computed(() => {
    let sum = 0
    for (const id of selected.value) {
        const p = products.value.find(p => p.id === id)
        if (p) sum += getPrice(p)
    }
    return sum
})

const remaining      = computed(() => budget.value - total.value)
const isOverBudget   = computed(() => total.value > budget.value)
const fillPercent    = computed(() => Math.min((total.value / budget.value) * 100, 100))

const score = computed(() => {
    if (isOverBudget.value || total.value === 0) return 0
    return Math.floor((total.value / budget.value) * 1000)
})

const stars = computed(() => {
    if (score.value >= 950) return 3
    if (score.value >= 800) return 2
    if (score.value >= 600) return 1
    return 0
})

const timerWarning = computed(() => timeLeft.value <= 10)
const timerSoon    = computed(() => timeLeft.value <= 30 && timeLeft.value > 10)

// ── game logic ─────────────────────────────────────────────
const startGame = async () => {
    gameState.value = 'loading'
    selected.value  = new Set()

    try {
        const cfg = DIFFICULTIES[selectedDiff.value]
        const res = await CatalogService.searchProducts('', {}, 1, 200)

        // Фильтруем: цена > 0 и не дороже 70% бюджета (чтобы не было ситуации когда 1 товар = весь бюджет)
        const valid = res.items.filter(p => {
            const price = getPrice(p)
            return price > 0 && price <= cfg.budget * 0.7
        })

        const shuffled = [...valid].sort(() => Math.random() - 0.5)
        products.value = shuffled.slice(0, Math.min(cfg.productCount, shuffled.length))

        // Бюджет ±10% для разнообразия
        const jitter = Math.floor((Math.random() * 0.2 - 0.1) * cfg.budget)
        budget.value = cfg.budget + jitter

        timeLeft.value   = cfg.time
        gameState.value  = 'playing'

        timerInterval = setInterval(() => {
            timeLeft.value--
            if (timeLeft.value <= 0) endGame()
        }, 1000)
    } catch (e) {
        console.error(e)
        gameState.value = 'setup'
    }
}

const toggle = (product: ProductDTO) => {
    if (gameState.value !== 'playing') return
    const price = getPrice(product)
    const next  = new Set(selected.value)

    if (next.has(product.id)) {
        next.delete(product.id)
        FpHaptics.light()
    } else {
        if (total.value + price > budget.value) {
            FpHaptics.warning()
            return  // Не даём превысить бюджет
        }
        next.add(product.id)
        FpHaptics.medium()
    }
    selected.value = next
}

const endGame = () => {
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null }
    gameState.value = 'result'

    if (score.value > bestScore.value) {
        bestScore.value = score.value
        localStorage.setItem('fp_basket_best', String(score.value))
    }

    if (stars.value >= 2) confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } })
    FpHaptics.success()

    gameService.saveGameScore({ game_type: 'basket', score: score.value, difficulty: selectedDiff.value })
}

const restart = () => {
    gameState.value = 'setup'
    products.value  = []
    selected.value  = new Set()
}

onUnmounted(() => { if (timerInterval) clearInterval(timerInterval) })
</script>

<template>
    <div class="basket-game">

        <!-- ── HEADER ── -->
        <header class="game-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <h1 class="game-title">Корзина на бюджет</h1>
            <div class="best-score" v-if="bestScore > 0">
                <Trophy :size="14" />
                {{ bestScore }}
            </div>
        </header>

        <!-- ══════════════════════════════════════════════
             SETUP
        ══════════════════════════════════════════════ -->
        <div v-if="gameState === 'setup'" class="setup-screen">
            <div class="setup-hero">
                <div class="hero-icon"><ShoppingCart :size="40" /></div>
                <h2>Набери корзину!</h2>
                <p>Добавляй товары из списка так, чтобы сумма была как можно ближе к бюджету — но не превысила его!</p>
            </div>

            <div class="difficulty-section">
                <p class="section-label">Сложность</p>
                <div class="diff-buttons">
                    <button
                        v-for="(cfg, key) in DIFFICULTIES"
                        :key="key"
                        class="diff-btn"
                        :class="{ active: selectedDiff === key }"
                        @click="selectedDiff = key as Difficulty"
                    >
                        <span class="diff-name">{{ cfg.label }}</span>
                        <span class="diff-meta">{{ formatPrice(cfg.budget) }} · {{ cfg.time }}с</span>
                    </button>
                </div>
            </div>

            <div class="rules-list">
                <div class="rule-item">✅ Тапни товар — добавить в корзину</div>
                <div class="rule-item">🚫 Нельзя выйти за бюджет</div>
                <div class="rule-item">⭐ 950+ очков = 3 звезды</div>
                <div class="rule-item">⏱ Успей до конца таймера</div>
            </div>

            <button class="start-btn" @click="startGame">Начать игру</button>
        </div>

        <!-- ══════════════════════════════════════════════
             LOADING
        ══════════════════════════════════════════════ -->
        <div v-else-if="gameState === 'loading'" class="center-state">
            <div class="loader"></div>
            <p>Загружаем товары...</p>
        </div>

        <!-- ══════════════════════════════════════════════
             PLAYING
        ══════════════════════════════════════════════ -->
        <div v-else-if="gameState === 'playing'" class="play-screen">
            <!-- Budget bar -->
            <div class="budget-bar-wrap">
                <div class="budget-labels">
                    <span class="budget-spent">{{ formatPrice(total) }}</span>
                    <span class="budget-target">/ {{ formatPrice(budget) }}</span>
                </div>
                <div class="budget-track">
                    <div
                        class="budget-fill"
                        :style="{ width: fillPercent + '%' }"
                        :class="{ 'near': fillPercent >= 80, 'full': fillPercent >= 95 }"
                    ></div>
                </div>
                <div class="budget-meta">
                    <span class="remaining">Остаток: <b>{{ formatPrice(remaining) }}</b></span>
                    <span
                        class="timer"
                        :class="{ warning: timerWarning, soon: timerSoon }"
                    >⏱ {{ timeLeft }}с</span>
                </div>
            </div>

            <!-- Products grid -->
            <div class="products-grid">
                <button
                    v-for="product in products"
                    :key="product.id"
                    class="product-card"
                    :class="{
                        selected: selected.has(product.id),
                        blocked: !selected.has(product.id) && total + getPrice(product) > budget
                    }"
                    @click="toggle(product)"
                >
                    <span class="product-name">{{ product.name }}</span>
                    <span class="product-price">{{ formatPrice(getPrice(product)) }}</span>
                    <div class="product-check">✓</div>
                </button>
            </div>

            <!-- Done button -->
            <div class="play-footer">
                <button class="done-btn" @click="endGame" :disabled="selected.size === 0">
                    Завершить ({{ selected.size }} товаров)
                </button>
            </div>
        </div>

        <!-- ══════════════════════════════════════════════
             RESULT
        ══════════════════════════════════════════════ -->
        <div v-else-if="gameState === 'result'" class="result-screen">
            <div class="result-stars">
                <span v-for="i in 3" :key="i" class="star" :class="{ earned: i <= stars }">★</span>
            </div>

            <div class="result-score">{{ score }}</div>
            <div class="result-label">очков</div>

            <div class="result-summary">
                <div class="result-row">
                    <span>Потрачено</span>
                    <b>{{ formatPrice(total) }}</b>
                </div>
                <div class="result-row">
                    <span>Бюджет</span>
                    <b>{{ formatPrice(budget) }}</b>
                </div>
                <div class="result-row accent">
                    <span>Точность</span>
                    <b>{{ fillPercent.toFixed(1) }}%</b>
                </div>
            </div>

            <p class="result-message">
                <template v-if="stars === 3">🎯 Идеально! Ювелирная точность!</template>
                <template v-else-if="stars === 2">👍 Отличный результат!</template>
                <template v-else-if="stars === 1">😊 Неплохо, но можно лучше!</template>
                <template v-else>😅 Попробуй ещё раз!</template>
            </p>

            <div v-if="score >= bestScore && score > 0" class="new-record">
                🏆 Новый рекорд!
            </div>

            <div class="result-actions">
                <button class="result-btn secondary" @click="restart">
                    <RefreshCcw :size="18" /> Ещё раз
                </button>
                <button class="result-btn primary" @click="router.back()">
                    В меню
                </button>
            </div>
        </div>

    </div>
</template>

<style scoped lang="scss">
.basket-game {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--spacing-md);
    overflow-y: auto;
    padding-bottom: 32px;
}

// ── Header ────────────────────────────────────────
.game-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-lg);
    flex-shrink: 0;
}

.game-title {
    font-size: 1.3rem;
    font-weight: 800;
    margin: 0;
    flex: 1;
    color: var(--color-text-primary);
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
    flex-shrink: 0;
}

.best-score {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 0.8rem;
    font-weight: 700;
    color: #f59e0b;
    background: color-mix(in srgb, #f59e0b 12%, transparent);
    padding: 4px 10px;
    border-radius: 20px;
}

// ── Setup ─────────────────────────────────────────
.setup-screen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.setup-hero {
    text-align: center;
    padding: var(--spacing-lg) 0;

    .hero-icon {
        width: 72px;
        height: 72px;
        background: color-mix(in srgb, var(--color-primary) 12%, var(--color-surface));
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-primary);
        margin: 0 auto var(--spacing-md);
        box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    h2 {
        font-size: 1.5rem;
        font-weight: 800;
        margin: 0 0 8px;
        color: var(--color-text-primary);
    }

    p {
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.5;
        font-size: 0.95rem;
    }
}

.section-label {
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-secondary);
    margin: 0 0 8px;
}

.diff-buttons {
    display: flex;
    gap: 8px;
}

.diff-btn {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 12px 8px;
    border: 2px solid var(--color-border);
    border-radius: 12px;
    background: var(--color-surface);
    cursor: pointer;
    transition: all 0.2s;

    &.active {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
        .diff-name { color: var(--color-primary); }
    }

    .diff-name {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--color-text-primary);
    }

    .diff-meta {
        font-size: 0.7rem;
        color: var(--color-text-secondary);
    }
}

.rules-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: var(--spacing-md);
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 12px;
}

.rule-item {
    font-size: 0.9rem;
    color: var(--color-text-secondary);
    line-height: 1.4;
}

.start-btn {
    width: 100%;
    padding: 16px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    border: none;
    border-radius: 14px;
    font-size: 1.1rem;
    font-weight: 800;
    cursor: pointer;
    transition: opacity 0.2s, transform 0.1s;
    box-shadow: 0 4px 16px color-mix(in srgb, var(--color-primary) 30%, transparent);

    &:active { transform: scale(0.98); }
}

// ── Loading ───────────────────────────────────────
.center-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--spacing-md);
    color: var(--color-text-secondary);
}

.loader {
    width: 36px;
    height: 36px;
    border: 3px solid var(--color-border);
    border-top-color: var(--color-primary);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

// ── Playing ───────────────────────────────────────
.play-screen {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    flex: 1;
}

.budget-bar-wrap {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: 12px 16px;
    flex-shrink: 0;
}

.budget-labels {
    display: flex;
    align-items: baseline;
    gap: 6px;
    margin-bottom: 8px;

    .budget-spent {
        font-size: 1.5rem;
        font-weight: 900;
        color: var(--color-text-primary);
        font-variant-numeric: tabular-nums;
    }

    .budget-target {
        font-size: 1rem;
        color: var(--color-text-secondary);
        font-weight: 600;
    }
}

.budget-track {
    height: 10px;
    background: var(--color-background);
    border-radius: 99px;
    overflow: hidden;
    margin-bottom: 8px;
}

.budget-fill {
    height: 100%;
    background: var(--color-primary);
    border-radius: 99px;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), background 0.3s;

    &.near { background: #f59e0b; }
    &.full { background: #10b981; }
}

.budget-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--color-text-secondary);

    .remaining b { color: var(--color-text-primary); }
}

.timer {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    transition: color 0.3s;

    &.soon    { color: #f59e0b; }
    &.warning { color: var(--color-error); animation: pulse 0.5s ease infinite alternate; }
}

@keyframes pulse { to { opacity: 0.5; } }

.products-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    flex: 1;
}

.product-card {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px;
    background: var(--color-surface);
    border: 2px solid var(--color-border);
    border-radius: 12px;
    cursor: pointer;
    text-align: left;
    transition: all 0.18s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &:active { transform: scale(0.96); }

    &.selected {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));

        .product-check { opacity: 1; transform: scale(1); }
        .product-price { color: var(--color-primary); }
    }

    &.blocked {
        opacity: 0.38;
        cursor: not-allowed;
    }
}

.product-name {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.product-price {
    font-size: 1rem;
    font-weight: 800;
    color: var(--color-text-primary);
    margin-top: auto;
    transition: color 0.18s;
}

.product-check {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 20px;
    height: 20px;
    background: var(--color-primary);
    color: white;
    border-radius: 50%;
    font-size: 11px;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transform: scale(0.5);
    transition: all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.play-footer {
    flex-shrink: 0;
    padding-top: 4px;
}

.done-btn {
    width: 100%;
    padding: 14px;
    background: var(--color-primary);
    color: var(--color-on-primary);
    border: none;
    border-radius: 12px;
    font-size: 1rem;
    font-weight: 700;
    cursor: pointer;
    transition: opacity 0.2s;

    &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
    }
}

// ── Result ────────────────────────────────────────
.result-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: var(--spacing-md);
    text-align: center;
    padding: var(--spacing-lg) 0;
}

.result-stars {
    display: flex;
    gap: 8px;
    font-size: 2.5rem;

    .star {
        color: var(--color-border);
        transition: color 0.3s, transform 0.3s;

        &.earned {
            color: #f59e0b;
            transform: scale(1.2);
        }
    }
}

.result-score {
    font-size: 4rem;
    font-weight: 900;
    color: var(--color-text-primary);
    line-height: 1;
    font-variant-numeric: tabular-nums;
}

.result-label {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin-top: -12px;
}

.result-summary {
    width: 100%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;
    padding: var(--spacing-md);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.result-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.95rem;
    color: var(--color-text-secondary);

    b { color: var(--color-text-primary); }

    &.accent b { color: var(--color-primary); font-size: 1.1rem; }
}

.result-message {
    font-size: 1rem;
    color: var(--color-text-secondary);
    margin: 0;
}

.new-record {
    background: color-mix(in srgb, #f59e0b 15%, var(--color-surface));
    color: #d97706;
    font-weight: 800;
    font-size: 0.95rem;
    padding: 8px 20px;
    border-radius: 99px;
    border: 1px solid color-mix(in srgb, #f59e0b 30%, transparent);
}

.result-actions {
    display: flex;
    gap: 10px;
    width: 100%;
}

.result-btn {
    flex: 1;
    padding: 14px;
    border-radius: 12px;
    font-size: 0.95rem;
    font-weight: 700;
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: opacity 0.2s;

    &.primary {
        background: var(--color-primary);
        color: var(--color-on-primary);
    }

    &.secondary {
        background: var(--color-surface);
        color: var(--color-text-primary);
        border: 1px solid var(--color-border);
    }
}
</style>
