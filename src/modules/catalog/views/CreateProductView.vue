<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import FpInput from '@/design-system/components/FpInput.vue'
import FpMobilePicker from '@/design-system/components/FpMobilePicker.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import FpCard from '@/design-system/components/FpCard.vue'
import { useNotify } from '@/composables/useNotify'
import { supportedLocales } from '@/i18n'
import { CatalogService } from '@/modules/catalog/services/CatalogService'

const { notify } = useNotify()

const router = useRouter()
const route = useRoute()
const name = ref('')
const barcode = ref(route.query.barcode as string || '')
const category = ref((route.query.category as string) || 'Бакалея')
const unit = ref('шт')
const isSubmitting = ref(false)
const translationInputs = ref<Record<string, string>>({})

for (const lang of supportedLocales) {
    translationInputs.value[lang] = ''
}

const extraCategories = ref<string[]>([])
const categoryItems = computed(() => {
    const all = [...catalogStore.categories.value, ...extraCategories.value]
    const unique = [...new Set(all)]
    return unique.map(c => ({ id: c, name: c }))
})
const units = ['шт', 'кг', 'л', 'уп'].map(u => ({ id: u, name: u }))
const unitItems = ref(units)

onMounted(() => catalogStore.loadCategories())

const handleCreate = async () => {
    if (!name.value) return

    isSubmitting.value = true
    try {
        const product = await catalogStore.createProduct({
            name: name.value,
            category: category.value as any,
            unit: unit.value,
            barcode: barcode.value || undefined
        })
        for (const lang of supportedLocales) {
            const trName = translationInputs.value[lang]
            if (trName && trName.trim().length > 0) {
                await CatalogService.upsertProductTranslation({
                    productId: product.id,
                    lang,
                    name: trName.trim()
                })
            }
        }
        router.push(`/product/${product.id}`)
    } catch (error: any) {
        console.error('Failed to create product:', error)
        notify(error.message || 'Не удалось создать товар', 'error')
    } finally {
        isSubmitting.value = false
    }
}

const createCategory = (val: string) => {
    extraCategories.value.push(val)
    category.value = val
}

const createUnit = (val: string) => {
    unitItems.value.push({ id: val, name: val })
    unit.value = val
}
</script>

<template>
    <div class="create-view">
        <header class="section-header">
            <h1>Новый товар</h1>
            <p>Добавьте товар в каталог, чтобы потом указать его цену</p>
        </header>

        <FpCard class="form-card">
            <div class="form-grid">
                <div v-if="barcode" class="barcode-badge">
                    <span class="barcode-icon">📷</span>
                    <span class="barcode-text">Штрих-код привязан: <strong>{{ barcode }}</strong></span>
                </div>

                <FpInput v-model="name" label="Название товара" placeholder="Например: Сыр Российский" autofocus />
                <div class="translation-block">
                    <div class="translation-title">Translations</div>
                    <FpInput v-for="lang in supportedLocales" :key="lang" v-model="translationInputs[lang]"
                        :label="`Name (${lang.toUpperCase()})`" placeholder="" />
                </div>

                <FpMobilePicker v-model="category" label="Категория" :items="categoryItems" allow-create
                    title="Выбор категории" @create="createCategory" />

                <FpMobilePicker v-model="unit" label="Единица измерения" :items="unitItems" allow-create
                    title="Единица измерения" @create="createUnit" />

                <div class="actions">
                    <FpButton size="lg" full-width :disabled="!name || isSubmitting" @click="handleCreate">
                        {{ isSubmitting ? 'Создание...' : 'Создать товар' }}
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

.barcode-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    color: var(--color-primary);
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px dashed var(--color-primary);
    font-size: 13px;

    .barcode-icon {
        font-size: 16px;
    }
}

.translation-block {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.translation-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-secondary);
}
</style>
