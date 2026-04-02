<script setup lang="ts">
import { useRouter } from 'vue-router'
import { Swords, Fingerprint, Brain, ShoppingCart, ArrowLeft } from 'lucide-vue-next'

const router = useRouter()
</script>

<template>
    <div class="games-hub">
        <header class="hub-header">
            <button class="icon-btn" @click="router.back()">
                <ArrowLeft :size="24" />
            </button>
            <h1 class="title">Игры и Развлечения</h1>
        </header>

        <p class="subtitle">Отдохните с пользой или потренируйте логику!</p>

        <div class="games-grid">
            <div class="game-card theme-accent" @click="router.push('/games/memory')">
                <div class="game-icon-wrap">
                    <Brain :size="32" />
                </div>
                <div class="game-info">
                    <h2>Мэмори</h2>
                    <p>Тренируй память и запоминай товары! Очки зависят от времени и сложности.</p>
                </div>
                <div class="play-btn-wrap">
                    <button class="play-btn">Играть</button>
                </div>
            </div>

            <div class="game-card theme-primary" @click="router.push('/games/price-battle')">
                <div class="game-icon-wrap">
                    <Swords :size="32" />
                </div>
                <div class="game-info">
                    <h2>Битва Цен</h2>
                    <p>Угадывай цены на реальные товары из своего списка покупок!</p>
                </div>
                <div class="play-btn-wrap">
                    <button class="play-btn">Играть</button>
                </div>
            </div>

            <div class="game-card theme-orange" @click="router.push('/games/basket')">
                <div class="game-icon-wrap">
                    <ShoppingCart :size="32" />
                </div>
                <div class="game-info">
                    <h2>Корзина на бюджет</h2>
                    <p>Набери товары из каталога как можно ближе к бюджету — но не превысь его!</p>
                </div>
                <div class="play-btn-wrap">
                    <button class="play-btn">Играть</button>
                </div>
            </div>

            <div class="game-card theme-success" @click="router.push('/games/flow')">
                <div class="game-icon-wrap">
                    <Fingerprint :size="32" />
                </div>
                <div class="game-info">
                    <h2>Цветные Точки</h2>
                    <p>Соединяй одинаковые цвета так, чтобы линии не пересекались.</p>
                </div>
                <div class="play-btn-wrap">
                    <button class="play-btn">Играть</button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped lang="scss">
.games-hub {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--spacing-md);
    background: radial-gradient(circle at top right, color-mix(in srgb, var(--color-primary) 5%, transparent), transparent);
}

.hub-header {
    display: flex;
    align-items: center;
    gap: var(--spacing-md);
    margin-bottom: var(--spacing-md);

    .title {
        font-size: 1.5rem;
        font-weight: 800;
        margin: 0;
        color: var(--color-text-primary);
    }
}

.subtitle {
    color: var(--color-text-secondary);
    margin-bottom: var(--spacing-xl);
    font-size: 1rem;
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
    transition: all 0.2s;

    &:hover { background: var(--color-surface-hover); }
}

.games-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
    max-width: 600px;
    width: 100%;
    margin: 0 auto;
}

.game-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    padding: var(--spacing-lg);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;

    &:hover {
        transform: translateY(-4px);
        box-shadow: var(--shadow-md);
    }
    
    &:active { transform: scale(0.98); }

    &.theme-primary {
        .game-icon-wrap { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
        .play-btn { background: var(--color-primary); color: white; }
    }
    
    &.theme-success {
        .game-icon-wrap { background: color-mix(in srgb, var(--color-success) 15%, transparent); color: var(--color-success); }
        .play-btn { background: var(--color-success); color: white; }
    }
    
    &.theme-accent {
        .game-icon-wrap { background: color-mix(in srgb, #f59e0b 15%, transparent); color: #f59e0b; }
        .play-btn { background: #f59e0b; color: white; }
    }

    &.theme-orange {
        .game-icon-wrap { background: color-mix(in srgb, #f97316 15%, transparent); color: #f97316; }
        .play-btn { background: #f97316; color: white; }
    }
}

.game-icon-wrap {
    width: 56px;
    height: 56px;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: center;
}

.game-info {
    h2 {
        font-size: 1.25rem;
        font-weight: 800;
        margin: 0 0 4px 0;
        color: var(--color-text-primary);
    }
    p {
        font-size: 0.95rem;
        color: var(--color-text-secondary);
        margin: 0;
        line-height: 1.4;
    }
}

.play-btn-wrap {
    margin-top: auto;
    display: flex;
    justify-content: flex-end;
}

.play-btn {
    padding: 8px 24px;
    border-radius: 99px;
    font-weight: 700;
    border: none;
    cursor: pointer;
    transition: opacity 0.2s;

    &:hover { opacity: 0.9; }
}
</style>
