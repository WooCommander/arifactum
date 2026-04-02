<script setup lang="ts">
import FpButton from './FpButton.vue'
import FpCard from './FpCard.vue'

defineProps<{
    visible: boolean
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    variant?: 'primary' | 'danger'
}>()

const emit = defineEmits<{
    (e: 'update:visible', value: boolean): void
    (e: 'confirm'): void
    (e: 'cancel'): void
}>()

const close = () => {
    emit('update:visible', false)
    emit('cancel')
}

const confirm = () => {
    emit('confirm')
    emit('update:visible', false)
}
</script>

<template>
    <Teleport to="body">
        <Transition name="fade">
            <div v-if="visible" class="modal-overlay" @click.self="close">
                <div class="modal-container">
                    <FpCard class="modal-card">
                        <div class="modal-header">
                            <h3>{{ title }}</h3>
                        </div>
                        <div class="modal-body">
                            <p>{{ message }}</p>
                        </div>
                        <div class="modal-footer">
                            <FpButton variant="text" @click="close">
                                {{ cancelText || 'Отмена' }}
                            </FpButton>
                            <FpButton :variant="variant || 'primary'" @click="confirm">
                                {{ confirmText || 'Подтвердить' }}
                            </FpButton>
                        </div>
                    </FpCard>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<style scoped lang="scss">
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: color-mix(in srgb, var(--color-text-primary) 60%, transparent);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
    padding: 16px;
}

.modal-container {
    width: 100%;
    max-width: 400px;
    animation: slideUp 0.3s ease-out;
}

.modal-card {
    background: var(--color-surface);
    // FpCard has padding, but we might want custom padding structure here
}

.modal-header h3 {
    margin: 0 0 12px 0;
    font-size: var(--text-h3);
}

.modal-body {
    margin-bottom: 24px;
    color: var(--color-text-secondary);
    font-size: var(--text-body-1);
    line-height: 1.5;
}

.modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
}

// Transitions
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

// Mobile optimization: Bottom sheet style if preferred, but centered card is also fine.
// Keeping centered card for consistency across devices for now as requested "good look on mobile".</style>
