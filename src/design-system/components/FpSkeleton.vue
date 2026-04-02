<script setup lang="ts">
import { computed } from 'vue'

interface Props {
    type?: 'text' | 'circle' | 'rectangle'
    width?: string
    height?: string
    borderRadius?: string
}

const props = withDefaults(defineProps<Props>(), {
    type: 'text'
})

const styles = computed(() => {
    const css: Record<string, string> = {}
    if (props.width) css.width = props.width
    if (props.height) css.height = props.height
    if (props.borderRadius) css.borderRadius = props.borderRadius
    return css
})
</script>

<template>
    <div class="fp-skeleton" :class="[`is-${type}`]" :style="styles" aria-hidden="true" />
</template>

<style scoped lang="scss">
.fp-skeleton {
    // Base colors matching the theme variables
    background-color: var(--color-surface-hover);
    background-image: linear-gradient(
        90deg,
        transparent 0%,
        color-mix(in srgb, var(--color-surface) 5%, transparent) 50%,
        transparent 100%
    );
    background-size: 200% 100%;
    animation: fp-shimmer 1.5s infinite linear;
    display: inline-block;

    &.is-text {
        width: 100%;
        height: 1.2em;
        border-radius: var(--radius-sm);
    }

    &.is-circle {
        border-radius: 50%;
        width: 48px;
        height: 48px;
        flex-shrink: 0;
    }

    &.is-rectangle {
        width: 100%;
        height: 100px;
        border-radius: var(--radius-md);
    }
}

:global(body.light-theme) {
    .fp-skeleton {
        background-color: var(--color-border);
        background-image: linear-gradient(
            90deg,
            transparent 0%,
            color-mix(in srgb, var(--color-surface) 40%, transparent) 50%,
            transparent 100%
        );
    }
}

@keyframes fp-shimmer {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}
</style>
