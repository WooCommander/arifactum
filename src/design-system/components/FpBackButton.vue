<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

interface Props {
    to?: string | object
}

const props = defineProps<Props>()

const handleClick = () => {
    if (props.to) {
        router.push(props.to)
    } else {
        router.back()
    }
}
</script>

<template>
    <button class="fp-back-btn" @click="handleClick" title="Назад">
        ←
    </button>
</template>

<style scoped lang="scss">
.fp-back-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 1.2rem;
    color: var(--color-text-primary);
    transition: all 0.2s;
    box-shadow: var(--shadow-sm);
    padding: 0; // Reset padding
    line-height: 1;

    &:hover {
        border-color: var(--color-primary);
        color: var(--color-primary);
        transform: translateX(-2px);
        box-shadow: var(--shadow-md);
    }

    &:active {
        transform: translateX(-2px) scale(0.95);
    }
}
</style>
