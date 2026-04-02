<script setup lang="ts">
interface Props {
    size?: 'sm' | 'md' | 'lg'
    color?: 'primary' | 'white'
}

withDefaults(defineProps<Props>(), {
    size: 'md',
    color: 'primary',
})
</script>

<template>
    <div class="fp-spinner" :class="[`size-${size}`, `color-${color}`]" role="status">
        <span class="sr-only">Loading...</span>
    </div>
</template>

<style scoped lang="scss">
.fp-spinner {
    display: inline-block;
    border-radius: 50%;
    border-style: solid;
    border-color: transparent;
    animation: spin 1s linear infinite;

    &.size-sm {
        width: 16px;
        height: 16px;
        border-width: 2px;
    }

    &.size-md {
        width: 32px;
        height: 32px;
        border-width: 3px;
    }

    &.size-lg {
        width: 48px;
        height: 48px;
        border-width: 4px;
    }

    &.color-primary {
        border-top-color: var(--color-primary);
        border-right-color: var(--color-primary);
        border-bottom-color: var(--color-primary);
    }

    &.color-white {
        border-top-color: var(--color-on-primary);
        border-right-color: var(--color-on-primary);
        border-bottom-color: var(--color-on-primary);
    }
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border-width: 0;
}
</style>
