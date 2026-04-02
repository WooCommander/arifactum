<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import FpButton from '@/design-system/components/FpButton.vue'
import FpInput from '@/design-system/components/FpInput.vue'
import FpConfirmationModal from '@/design-system/components/FpConfirmationModal.vue'
import { FpSkeleton } from '@/design-system'
import { catalogStore } from '@/modules/catalog/store/catalogStore'
import { shoppingListStore } from '@/modules/shopping-list/state/shoppingListStore'
import { authStore } from '@/modules/auth/store/authStore'
import { useNotify } from '@/composables/useNotify'

import PriceChart from '@/components/PriceChart.vue'
import CheapPlacesList from '@/modules/analytics/components/CheapPlacesList.vue'
import { AnalyticsService } from '@/modules/analytics/services/AnalyticsService'
import { VerificationService } from '@/modules/prices/services/VerificationService'
import { ArrowLeft, Trash2 } from 'lucide-vue-next'
import type { CheapPlace } from '@/modules/analytics/services/AnalyticsService'
import { CurrencyService } from '@/modules/catalog/services/CurrencyService'
import { CatalogService } from '@/modules/catalog/services/CatalogService'
import { useI18n } from 'vue-i18n'
import { supportedLocales } from '@/i18n'

const route = useRoute()
const router = useRouter()
const { currentProduct, currentCurrency } = catalogStore
const { notify } = useNotify()
const { locale } = useI18n()

const formatPrice = computed(() => (price: number) => {
	const currency = currentCurrency.value
	return CurrencyService.format(CurrencyService.convert(price, 'RUB', currency), currency)
})

const translationNames = ref<Record<string, string>>({})
const translationCategory = ref('')

// Product Editing State
const isEditingProduct = ref(false)
const productForm = ref({ name: '', category: '', unit: '' })
const translationEdits = ref<Record<string, string>>({})

// Analytics
const selectedPeriod = ref<'7d' | '30d' | '90d' | 'all'>('all')
const bestPlaces = ref<CheapPlace[]>([])

const currentUserId = computed(() => authStore.user.value?.id)

onMounted(async () => {
	// Ensure auth is init
	if (!authStore.user.value) {
		await authStore.init()
	}

	const id = route.params.id as string
	if (id) {
		await catalogStore.loadProductById(id)
		AnalyticsService.getBestPlaces(id).then(places => {
			bestPlaces.value = places
		})
		await loadTranslations(id)
	}
})

watch(locale, async () => {
	if (currentProduct.value?.id) {
		await loadTranslations(currentProduct.value.id)
	}
})

async function loadTranslations(productId: string) {
	translationNames.value = {}
	translationCategory.value = ''
	const translations = await CatalogService.getProductTranslations(productId)
	for (const tr of translations) {
		if (tr.lang && tr.name) {
			translationNames.value[tr.lang] = tr.name
		}
	}
}

const displayName = computed(() => {
	const lang = locale.value as string
	return translationNames.value[lang] || currentProduct.value?.name || ''
})

const latestHistory = computed(() => {
	if (!currentProduct.value?.history) return []
	return currentProduct.value.history
})

// ... (chartData computed) ...

const chartData = computed(() => {
	if (!latestHistory.value) return []
	let history = latestHistory.value
	if (selectedPeriod.value !== 'all') {
		const days = selectedPeriod.value === '7d' ? 7 : selectedPeriod.value === '30d' ? 30 : 90
		const since = new Date()
		since.setDate(since.getDate() - days)
		history = history.filter(h => new Date(h.date) >= since)
	}
	return history
		.map(h => ({
			date: new Date(h.date),
			price: h.price
		}))
		.filter(d => !isNaN(d.price) && !isNaN(d.date.getTime()))
})

// --- Product Actions ---

const startEditProduct = () => {
	if (currentProduct.value) {
		productForm.value = {
			name: currentProduct.value.name,
			category: currentProduct.value.category,
			unit: currentProduct.value.unit || 'шт'
		}
		translationEdits.value = { ...translationNames.value }
		isEditingProduct.value = true
	}
}

const cancelEditProduct = () => {
	isEditingProduct.value = false
}

const saveProduct = async () => {
	if (currentProduct.value) {
		await catalogStore.updateProduct(currentProduct.value.id, productForm.value)
		for (const lang of supportedLocales) {
			const name = translationEdits.value[lang]
			if (name && name.trim().length > 0) {
				await CatalogService.upsertProductTranslation({
					productId: currentProduct.value.id,
					lang,
					name: name.trim()
				})
			}
		}
		isEditingProduct.value = false
		await loadTranslations(currentProduct.value.id)
	}
}

const showDeleteModal = ref(false)

const confirmDeleteProduct = () => {
	showDeleteModal.value = true
}

const handleDeleteConfirm = async () => {
	if (currentProduct.value) {
		try {
			await catalogStore.deleteProduct(currentProduct.value.id)
			router.back()
		} catch (e: any) {
			console.error('Failed to delete product:', e)
			notify(`Не удалось удалить товар: ${e.message || e}`, 'error')
		}
	}
}

// --- Price Deletion ---
const showDeletePriceModal = ref(false)
const priceToDeleteId = ref<string | null>(null)

const confirmDeletePrice = (priceId: string) => {
	priceToDeleteId.value = priceId
	showDeletePriceModal.value = true
}

const handleDeletePrice = async () => {
	if (priceToDeleteId.value) {
		try {
			await catalogStore.deletePrice(priceToDeleteId.value)
			showDeletePriceModal.value = false
			priceToDeleteId.value = null
		} catch (e: any) {
			console.error('Failed to delete price:', e)
			notify(`Не удалось удалить цену: ${e.message || e}`, 'error')
		}
	}
}

// Store editing removed from this view for simplicity

const goToAddPrice = () => {
	if (currentProduct.value) {
		router.push(`/add-price/${currentProduct.value.id}`)
	}
}

const isFavorite = computed(() => {
	if (!currentProduct.value) return false
	return catalogStore.isFavorite(currentProduct.value.id)
})

const toggleFavorite = async () => {
	if (currentProduct.value) {
		await catalogStore.toggleFavorite(currentProduct.value.id)
	}
}

const addToShoppingList = async () => {
	if (currentProduct.value) {
		try {
			await shoppingListStore.addItem(currentProduct.value.name, currentProduct.value.id)
			notify('Добавлено в список покупок!', 'success')
		} catch (e) {
			notify('Не удалось добавить в список', 'error')
		}
	}
}

const cheapestStore = computed(() => {
	if (!latestHistory.value || latestHistory.value.length === 0) return null

	// Filter prices that have store info and are valid numbers
	const validPrices = latestHistory.value.filter(h => h.price > 0 && h.storeName)
	if (validPrices.length === 0) return null

	const sorted = [...validPrices].sort((a, b) => a.price - b.price)
	return {
		price: sorted[0].price,
		storeName: sorted[0].storeName,
		storeId: sorted[0].storeId
	}
})

const priceStatusLabel = computed(() => {
	if (currentProduct.value?.priceStatus === 'good') return '🔥 Выгодная цена'
	if (currentProduct.value?.priceStatus === 'bad') return '⚠️ Дорого'
	return '⚖️ Обычная цена'
})

const sortedHistory = computed(() =>
	[...latestHistory.value].sort((a, b) => b.freshnessScore - a.freshnessScore)
)

const votingInProgress = ref<Set<string>>(new Set())

async function handleVote(priceId: string | undefined, voteType: 'confirm' | 'deny') {
	if (!priceId || votingInProgress.value.has(priceId)) return
	votingInProgress.value = new Set([...votingInProgress.value, priceId])
	try {
		const item = latestHistory.value.find(h => h.id === priceId)
		if (item?.userVote === voteType) {
			await VerificationService.removeVote(priceId)
		} else {
			await VerificationService.vote(priceId, voteType)
		}
		await catalogStore.loadProductById(route.params.id as string)
	} catch (e) {
		console.error('Vote failed:', e)
	} finally {
		const next = new Set(votingInProgress.value)
		next.delete(priceId)
		votingInProgress.value = next
	}
}

</script>

<template>
	<div class="product-view">
		<div v-if="currentProduct" class="content-body">
			<!-- Standardized Header -->
			<div class="sticky-search-wrapper product-header">
				<div class="header-inner">
					<button class="nav-btn" @click="router.back()">
						<ArrowLeft :size="24" :stroke-width="2.5" />
					</button>
					<h2 class="header-title">Детали товара</h2>
					<div class="header-actions">
						<button class="action-icon-btn" @click="toggleFavorite"
							:title="isFavorite ? 'Убрать из избранного' : 'В избранное'">
							<span v-if="isFavorite">⭐</span>
							<span v-else>☆</span>
						</button>
						<button class="action-icon-btn" @click="startEditProduct" title="Редактировать">
							<span>✏️</span>
						</button>
						<button class="action-icon-btn danger" @click="confirmDeleteProduct" title="Удалить">
							<span>🗑️</span>
						</button>
					</div>
				</div>
			</div>

			<!-- VALUE CARD -->
			<div class="value-card">
				<div class="card-header-info">
					<span class="card-category">{{ translationCategory || currentProduct.category }}</span>
					<h1 class="card-title">{{ displayName || currentProduct.name }}</h1>
				</div>

				<div class="price-hero">
					<span class="main-price">{{ currentProduct.lastPrice ? formatPrice(currentProduct.lastPrice) : 'Нет цены'
						}}</span>
					<span class="unit-label" v-if="currentProduct.unit">за {{ currentProduct.unit }}</span>
				</div>

				<div class="value-analysis">
					<span class="analysis-pill" :class="currentProduct.priceStatus">
						{{ priceStatusLabel }}
					</span>
					<span class="avg-ref" v-if="currentProduct.averagePrice">Средняя: ~{{ formatPrice(currentProduct.averagePrice)
						}}</span>
				</div>

				<!-- Cheapest Store Insight -->
				<div v-if="cheapestStore && cheapestStore.price < (currentProduct.lastPrice || 0)" class="cheapest-insight"
					@click="router.push(`/store/${cheapestStore.storeId}`)">
					<div class="insight-label">Лучшая цена была здесь:</div>
					<div class="insight-value">
						<span class="price">{{ formatPrice(cheapestStore.price) }}</span>
						<span class="store">🏪 {{ cheapestStore.storeName }}</span>
					</div>
				</div>

				<!-- Primary Action (Update Price) -->
				<div class="primary-action">
					<FpButton size="md" width="full" @click="goToAddPrice">
						Обновить цену
					</FpButton>
				</div>
			</div>

			<!-- SEPARATE CHART BLOCK -->
			<div class="chart-card" v-if="latestHistory.length > 1">
				<div class="chart-header">
					<div class="chart-title">Динамика цен</div>
					<div class="period-tabs">
						<button
							v-for="p in [{ key: '7d', label: '7д' }, { key: '30d', label: '30д' }, { key: '90d', label: '90д' }, { key: 'all', label: 'Всё' }]"
							:key="p.key" class="period-tab" :class="{ active: selectedPeriod === p.key }"
							@click="selectedPeriod = p.key as any">{{ p.label }}</button>
					</div>
				</div>
				<div v-if="chartData.length > 1">
					<PriceChart :data="chartData" :average-price="currentProduct.averagePrice" :height="120" />
				</div>
				<div v-else class="chart-empty-period">Нет данных за выбранный период</div>
			</div>

			<!-- BEST PLACES BLOCK -->
			<div class="best-places-card" v-if="bestPlaces.length > 0">
				<div class="chart-title">Лучшие цены по магазинам</div>
				<CheapPlacesList :places="bestPlaces" />
			</div>

			<!-- SECONDARY ACTIONS -->
			<div class="secondary-actions">
				<FpButton variant="outline" size="sm" @click="addToShoppingList">
					📝 В список
				</FpButton>
				<FpButton variant="outline" size="sm"
					@click="router.push({ path: '/catalog', query: { category: currentProduct.category } })">
					📂 В категорию
				</FpButton>
			</div>

			<!-- HISTORY LIST (Compact) -->
			<div class="history-section">
				<div class="history-cards-list">
					<div v-for="(item, idx) in sortedHistory" :key="item.id || idx" class="history-card-item">
						<div class="h-card-left">
							<div class="h-price">{{ formatPrice(item.price) }}</div>
							<div class="h-store">{{ item.storeName }}</div>
							<div v-if="item.freshnessLabel" class="h-freshness-label">{{ item.freshnessLabel }}</div>
						</div>
						<div class="h-card-right">
							<div class="h-date">{{ item.dateRelative }}</div>

							<div v-if="item.createdBy !== currentUserId" class="vote-row">
								<button class="vote-btn confirm" :class="{ active: item.userVote === 'confirm' }"
									:disabled="votingInProgress.has(item.id!)" @click.stop="handleVote(item.id, 'confirm')">
									👍<span v-if="item.confirmCount > 0"> {{ item.confirmCount }}</span>
								</button>
								<button class="vote-btn deny" :class="{ active: item.userVote === 'deny' }"
									:disabled="votingInProgress.has(item.id!)" @click.stop="handleVote(item.id, 'deny')">
									👎<span v-if="item.denyCount > 0"> {{ item.denyCount }}</span>
								</button>
							</div>

							<button v-if="item.createdBy === currentUserId && item.id" class="delete-price-btn"
								@click.stop="confirmDeletePrice(item.id)">
								<Trash2 :size="14" />
							</button>
						</div>
					</div>
				</div>
			</div>

			<!-- Edit Modal (Overlay) -->
			<div v-if="isEditingProduct" class="edit-modal-overlay" @click.self="cancelEditProduct">
				<div class="edit-modal-card">
					<h3 class="modal-title">Редактирование</h3>

					<div class="modal-form">
						<FpInput v-model="productForm.name" label="Название товара" placeholder="Введите название" />
						<div class="form-row">
							<FpInput v-model="productForm.category" label="Категория" placeholder="Категория" style="flex: 2" />
							<FpInput v-model="productForm.unit" label="Ед. изм." placeholder="шт/кг" style="flex: 1" />
						</div>
						<div class="translation-block">
							<div class="translation-title">Translations</div>
							<FpInput v-for="lang in supportedLocales" :key="lang" v-model="translationEdits[lang]"
								:label="`Name (${lang.toUpperCase()})`" placeholder="" />
						</div>
					</div>

					<div class="modal-actions">
						<FpButton size="md" width="full" @click="saveProduct">
							Сохранить
						</FpButton>
						<FpButton size="md" variant="text" width="full" @click="cancelEditProduct">
							Отмена
						</FpButton>
					</div>
				</div>
			</div>
		</div>

		<div v-else class="loading-state" style="display: flex; flex-direction: column; gap: 16px; padding-top: 16px;">
			<!-- Header skeleton -->
			<div style="display: flex; gap: 12px; align-items: center;">
				<FpSkeleton width="36px" height="36px" borderRadius="50%" />
				<FpSkeleton width="60%" height="28px" />
			</div>
			<!-- Value card skeleton -->
			<div style="background: var(--color-surface); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--color-border); display: flex; flex-direction: column; gap: 12px;">
				<FpSkeleton width="30%" height="14px" />
				<FpSkeleton width="80%" height="24px" />
				<div style="display: flex; align-items: baseline; gap: 8px; margin-top: 8px;">
					<FpSkeleton width="100px" height="36px" />
					<FpSkeleton width="60px" height="16px" />
				</div>
				<FpSkeleton width="100%" height="44px" style="margin-top: 16px;" />
			</div>
			<!-- Chart card skeleton -->
			<div style="background: var(--color-surface); padding: 16px; border-radius: var(--radius-lg); border: 1px solid var(--color-border); height: 200px;">
				<FpSkeleton width="40%" height="20px" style="margin-bottom: 24px;" />
				<FpSkeleton width="100%" height="120px" />
			</div>
		</div>

		<FpConfirmationModal :visible="showDeleteModal" title="Удаление товара" message="Удалить товар навсегда?"
			confirm-text="Да, удалить" variant="danger" @update:visible="showDeleteModal = $event"
			@confirm="handleDeleteConfirm" />

		<FpConfirmationModal :visible="showDeletePriceModal" title="Удаление цены" message="Удалить эту цену из истории?"
			confirm-text="Да, удалить" variant="danger" @update:visible="showDeletePriceModal = $event"
			@confirm="handleDeletePrice" />
	</div>
</template>

<style scoped lang="scss">
.product-view {
	padding-bottom: 40px;
}


.product-header {
	background: var(--color-surface) !important;
	border-bottom: 1px solid var(--color-border) !important;
	padding: 0 !important;
	margin: 0 -16px !important;

	.header-inner {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 8px 16px;
		height: 60px;
	}

	.header-title {
		font-size: 17px;
		font-weight: 700;
		margin: 0;
		position: absolute;
		left: 50%;
		transform: translateX(-50%);
	}

	.header-actions {
		display: flex;
		gap: 8px;
	}
}

.action-icon-btn {
	background: none;
	border: none;
	font-size: 20px;
	cursor: pointer;
	width: 36px;
	height: 36px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	transition: background 0.2s;

	&:active {
		background: var(--color-surface-hover);
	}

	&.danger:active {
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}
}


.nav-btn {
	background: transparent;
	border: none;
	color: var(--color-text-secondary); // Default color
	width: 40px; // Standard touch target
	height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	cursor: pointer;
	transition: background 0.2s, color 0.2s;

	&:active {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}
}

.icon-starred {
	color: var(--color-warning);
}

.danger-icon {
	&:active {
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}
}

.header-content {
	flex: 1;
}

.header-controls {
	display: flex;
	gap: 0;
}

.content-body {
	padding: 16px;

	@media (max-width: 600px) {
		padding: 0.5rem var(--spacing-sm);
	}

	display: flex;
	flex-direction: column;
	gap: 16px; // Adjusted gap
}

// VALUE CARD
.value-card {
	background: var(--color-surface);
	border-radius: 20px;
	padding: 24px 20px; // Slightly more vertical padding
	text-align: center;
	box-shadow: 0 4px 20px rgba(0, 0, 0, 0.04);
	border: 1px solid var(--color-border);
	position: relative;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.card-header-info {
	margin-bottom: 20px;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8px;
}

.card-category {
	font-size: 1rem;
	text-transform: uppercase;
	letter-spacing: 1.5px;
	font-weight: 700;
	color: var(--color-primary);
	background: var(--color-surface-hover);
	padding: 6px 12px;
	border-radius: 20px;
}

.card-title {
	font-size: 22px; // Standard legible size
	font-weight: 700; // Bold sans-serif
	line-height: 1.3;
	color: var(--color-text-primary);
	margin: 0;
	// No serif font here
}

.card-top-info {
	display: flex;
	justify-content: center;
	gap: 8px;
	margin-bottom: 8px;
	font-size: 1rem;
	color: var(--color-text-secondary);
	align-items: center;
}

.date-badge {
	font-size: 14px; // Increased for readability
	color: var(--color-text-secondary);
	font-weight: 500;
}

.store-badge {
	font-weight: 500;
	color: var(--color-text-primary);
	background: var(--color-background);
	padding: 4px 8px;
	border-radius: 8px;
}

.price-hero {
	margin-bottom: 12px; // Tighter
	display: flex;
	flex-direction: column;
	align-items: center;
}

.main-price {
	font-size: 40px; // Reduced from 48
	font-weight: 800;
	color: var(--color-text-primary);
	line-height: 1;
	letter-spacing: -1px;
}

.unit-label {
	font-size: 1rem;
	color: var(--color-text-tertiary);
	margin-top: 2px;
}

.value-analysis {
	display: flex;
	align-items: center; // Horizontal alignment if possible, or tight vertical
	justify-content: center;
	gap: 8px;
	margin-bottom: 16px; // Tighter
	flex-wrap: wrap;
}

.analysis-pill {
	padding: 4px 10px;
	border-radius: 16px;
	font-size: 1rem;
	font-weight: 600;

	&.good {
		background: color-mix(in srgb, var(--color-success) 10%, transparent);
		color: var(--color-success);
	}

	&.bad {
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
		color: var(--color-error);
	}
}

.badge-bad {
	color: var(--color-error);
	background: color-mix(in srgb, var(--color-error) 10%, transparent);
	padding: 4px 10px;
	border-radius: 16px;
	font-size: 1rem;
	font-weight: 600;
}

.cheapest-insight {
	background: linear-gradient(135deg, color-mix(in srgb, var(--color-success) 10%, transparent), transparent);
	border: 1px dashed var(--color-success);
	border-radius: 12px;
	padding: 12px;
	;
	margin: 16px 0;
	width: 100%;
	cursor: pointer;
	transition: transform 0.2s;

	&:active {
		transform: scale(0.98);
	}

	.stat-label {
		font-size: 10px;
		font-weight: 600;
		color: var(--color-text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.5px;
	}

	.stat-footer-text {
		font-size: 11px;
		font-weight: 700;
		color: var(--color-primary);
		margin-top: 2px;
	}

	.insight-label {
		font-size: 11px;
		font-weight: 700;
		color: var(--color-success);
		text-transform: uppercase;
		margin-bottom: 4px;
	}

	.insight-value {
		display: flex;
		justify-content: space-between;
		align-items: baseline;

		.price {
			font-size: 18px;
			font-weight: 800;
			color: var(--color-success);
		}

		.store {
			font-size: 13px;
			color: var(--color-text-secondary);
			font-weight: 500;
		}
	}
}

.avg-ref {
	font-size: 14px; // Increased
	color: var(--color-text-secondary);
	font-weight: 500;
}

// SECONDARY ACTIONS
.secondary-actions {
	display: flex;
	gap: 8px; // Reduced gap
	justify-content: center; // Center on screen
	flex-wrap: wrap;
}

// CHART CARD
.chart-card {
	background: var(--color-surface);
	border-radius: 20px;
	padding: 16px;
	border: 1px solid var(--color-border);
	box-shadow: var(--shadow-sm);
}

.chart-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 12px;
}

.chart-title {
	font-size: 14px;
	font-weight: 600;
	color: var(--color-text-secondary);
	padding-left: 4px;
}

.period-tabs {
	display: flex;
	gap: 4px;
}

.period-tab {
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: 8px;
	padding: 4px 8px;
	font-size: 12px;
	font-weight: 500;
	color: var(--color-text-secondary);
	cursor: pointer;
	transition: background 0.15s, color 0.15s;

	&.active {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}
}

.chart-empty-period {
	height: 80px;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 13px;
	color: var(--color-text-disabled);
}

.best-places-card {
	background: var(--color-surface);
	border-radius: 20px;
	padding: 16px;
	border: 1px solid var(--color-border);
	box-shadow: var(--shadow-sm);

	.chart-title {
		margin-bottom: 12px;
	}
}

.history-cards-list {
	display: flex;
	flex-direction: column;
	gap: 8px; // Reduced gap
	margin-top: 16px; // Space from secondary actions
}

.history-card-item {
	background: var(--color-surface);
	border: 1px solid var(--color-border);
	border-radius: 8px; // Smaller radius
	padding: 8px 12px; // Compact padding
	display: flex;
	justify-content: space-between;
	align-items: center;
	// Removed shadow for flatter, less "heavy" look
	transition: transform 0.1s;

	&:active {
		transform: scale(0.99);
		background: var(--color-surface-hover);
	}
}

.h-card-left {
	display: flex;
	flex-direction: column;
	gap: 0; // Tighter
}

.h-price {
	font-size: 16px; // Smaller price
	font-weight: 700;
	color: var(--color-text-primary);
	line-height: 1.2;
}

.h-store {
	font-size: 1rem; // Smaller store
	color: var(--color-text-secondary);
	font-weight: 400;
}

.h-card-right {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 4px;
}

.h-date {
	font-size: 1rem; // Smaller date
	color: var(--color-text-tertiary);
}

.delete-price-btn {
	background: transparent;
	border: none;
	color: var(--color-text-tertiary);
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	transition: color 0.2s, background 0.2s;

	&:hover {
		color: var(--color-error);
		background: color-mix(in srgb, var(--color-error) 10%, transparent);
	}
}

.h-freshness-label {
	font-size: 11px;
	font-weight: 500;
	color: var(--color-text-tertiary);
	margin-top: 2px;
}

.vote-row {
	display: flex;
	gap: 4px;
	align-items: center;
	margin-top: 2px;
}

.vote-btn {
	background: transparent;
	border: 1px solid var(--color-border);
	border-radius: 6px;
	padding: 2px 6px;
	font-size: 12px;
	cursor: pointer;
	transition: background 0.15s, border-color 0.15s;
	min-width: 28px;
	color: var(--color-text-secondary);
	line-height: 1.4;

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	&.confirm.active {
		background: color-mix(in srgb, var(--color-success) 15%, transparent);
		border-color: var(--color-success);
		color: var(--color-success);
	}

	&.deny.active {
		background: color-mix(in srgb, var(--color-error) 12%, transparent);
		border-color: var(--color-error);
		color: var(--color-error);
	}

	&:active:not(:disabled) {
		background: var(--color-surface-hover);
	}
}

// MODAL STYLES
.edit-modal-overlay {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: color-mix(in srgb, var(--color-text-primary) 60%, transparent); // Dimmed background
	display: flex;
	align-items: center;
	justify-content: center;
	z-index: 1000;
	backdrop-filter: blur(4px);
	padding: 16px;
}

.edit-modal-card {
	background: var(--color-surface);
	border-radius: 24px;
	padding: 24px;
	width: 100%;
	max-width: 340px;
	box-shadow: var(--shadow-2);
	animation: modal-pop 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

@keyframes modal-pop {
	from {
		transform: scale(0.9);
		opacity: 0;
	}

	to {
		transform: scale(1);
		opacity: 1;
	}
}

.modal-title {
	font-size: 20px;
	font-weight: 700;
	text-align: center;
	margin: 0 0 24px 0;
	color: var(--color-text-primary);
}

.modal-form {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-bottom: 24px;
}

.translation-block {
	display: flex;
	flex-direction: column;
	gap: 8px;
	margin-top: 6px;
}

.translation-title {
	font-size: 12px;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.06em;
	color: var(--color-text-secondary);
}

.modal-actions {
	display: flex;
	flex-direction: column;
	gap: 12px;
}

.delete-action {
	margin-top: 12px;
	padding-top: 12px;
	border-top: 1px solid var(--color-border);
}

.loading-state {
	display: flex;
	justify-content: center;
	padding: 40px;
}
</style>
