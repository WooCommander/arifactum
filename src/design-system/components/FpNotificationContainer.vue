<script setup lang="ts">
import { useNotify } from '@/composables/useNotify'

const { notifications, dismiss } = useNotify()

const iconMap: Record<string, string> = {
    success: '✓',
    error: '✕',
    info: 'i',
    warning: '!',
    birthday: '🎂'
}
</script>

<template>
    <Teleport to="body">
        <TransitionGroup tag="div" name="fp-notif" class="fp-notif-container">
            <div v-for="n in notifications" :key="n.id" class="fp-notif" :class="`fp-notif--${n.type}`"
                @click="dismiss(n.id)">
                <span class="fp-notif__icon">{{ iconMap[n.type] }}</span>
                <span class="fp-notif__msg">{{ n.message }}</span>
            </div>
        </TransitionGroup>
    </Teleport>
</template>

<style scoped lang="scss">
.fp-notif-container {
    position: fixed;
    bottom: calc(64px + env(safe-area-inset-bottom, 0px) + 12px);
    left: 16px;
    right: 16px;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
    align-items: center;
}

.fp-notif {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    ;
    border-radius: 14px;
    font-size: 14px;
    font-weight: 500;
    width: 100%;
    max-width: 400px;
    box-shadow: 0 4px 20px color-mix(in srgb, var(--color-text-primary) 18%, transparent);
    pointer-events: auto;
    cursor: pointer;
    line-height: 1.4;

    &--success {
        background: var(--color-success);
        color: var(--color-on-primary);
    }

    &--error {
        background: var(--color-error);
        color: var(--color-on-primary);
    }

    &--info {
        background: var(--color-primary);
        color: var(--color-on-primary);
    }

    &--warning {
        background: var(--color-warning);
        color: var(--color-on-primary);
    }

    &--birthday {
        background: linear-gradient(135deg, #FF3CAC 0%, #784BA0 50%, #2B86C5 100%);
        color: #fff;
        border: 2px solid rgba(255, 255, 255, 0.2);
        animation: fp-bounce-in 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        
        .fp-notif__icon {
            background: rgba(255, 255, 255, 0.3);
            font-size: 14px;
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
        }
    }
}

.fp-notif__icon {
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-on-primary) 25%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 700;
}

.fp-notif__msg {
    flex: 1;
}

// Animations
.fp-notif-enter-active,
.fp-notif-leave-active {
    transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.fp-notif-enter-from {
    opacity: 0;
    transform: translateY(16px) scale(0.95);
}

.fp-notif-leave-to {
    opacity: 0;
    transform: translateY(8px) scale(0.95);
}

.fp-notif-move {
    transition: transform 0.28s ease;
}

@keyframes fp-bounce-in {
    0% { transform: scale(0.3); opacity: 0; }
    50% { transform: scale(1.05); }
    70% { transform: scale(0.9); }
    100% { transform: scale(1); opacity: 1; }
}
</style>
