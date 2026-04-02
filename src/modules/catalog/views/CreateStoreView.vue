<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '@/api/supabase'
import FpInput from '@/design-system/components/FpInput.vue'
import FpButton from '@/design-system/components/FpButton.vue'

const router = useRouter()
const name = ref('')
const isSubmitting = ref(false)

const handleCreate = async () => {
    if (!name.value) return

    isSubmitting.value = true
    try {
        const { data, error } = await supabase
            .from('stores')
            .insert({
                name: name.value,
                created_by: (await supabase.auth.getUser()).data.user?.id
            })
            .select('id')
            .single()

        if (error) throw error

        // Redirect to a store view or back
        router.push(`/store/${data.id}`)
    } catch (error: any) {
        console.error('Failed to create store:', error)
        alert(`Ошибка: ${error.message || error}`)
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <div class="create-view">
        <header class="section-header">
            <h1>Новое место</h1>
            <p>Добавьте магазин, рынок или супермаркет</p>
        </header>

        <FpCard class="form-card">
            <div class="form-grid">
                <FpInput v-model="name" label="Название" placeholder="Например: Супермаркет Корзинка" autofocus />

                <div class="actions">
                    <FpButton size="lg" full-width :disabled="!name || isSubmitting" @click="handleCreate">
                        {{ isSubmitting ? 'Создание...' : 'Добавить место' }}
                    </FpButton>
                </div>
            </div>
        </FpCard>
    </div>
</template>

<style scoped lang="scss">
.create-view {
    padding: var(--spacing-md) var(--spacing-sm);
}

.section-header {
    margin-bottom: var(--spacing-xl);
    text-align: center;

    h1 {
        font-size: var(--text-h5);
        font-weight: 700;
        margin-bottom: 8px;
    }

    p {
        color: var(--color-text-secondary);
        font-size: var(--text-body-2);
    }
}

.form-grid {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-lg);
}

.actions {
    margin-top: var(--spacing-md);
}
</style>
