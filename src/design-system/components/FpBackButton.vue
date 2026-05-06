<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowLeft } from 'lucide-vue-next'

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
        <ArrowLeft :size="20" stroke-width="2.5" />
    </button>
</template>

<style scoped lang="scss">
.fp-back-btn {
    width: 42px;
    height: 42px;
    border-radius: 14px; // Squircle/Soft corner
    border: 1px solid color-mix(in srgb, var(--color-primary) 20%, var(--color-border));
    background: var(--color-surface);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-primary);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
    padding: 0;
    line-height: 1;

    &:hover {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
        transform: translateX(-3px);
        box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 15%, transparent);
    }

    &:active {
        transform: translateX(-3px) scale(0.95);
    }
}
</style>
