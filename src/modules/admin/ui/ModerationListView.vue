<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ModerationService, type ModerationRoute } from '../services/ModerationService'
import { FpBackButton, FpCard, FpButton, FpSpinner, FpConfirmationModal, FpInput } from '@/design-system'
import { Clock, MapPin, User, ChevronRight, Check, X } from 'lucide-vue-next'

const router = useRouter()
const routes = ref<ModerationRoute[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

// Actions state
const showRejectModal = ref(false)
const selectedRouteId = ref<string | null>(null)
const rejectReason = ref('')
const isProcessing = ref(false)

async function load() {
    isLoading.value = true
    try {
        routes.value = await ModerationService.getPendingRoutes()
    } catch (e: any) {
        error.value = 'Ошибка загрузки маршрутов'
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

async function handleApprove(id: string) {
    isProcessing.value = true
    try {
        await ModerationService.approveRoute(id)
        routes.value = routes.value.filter(r => r.id !== id)
    } catch (e) {
        alert('Ошибка при одобрении')
    } finally {
        isProcessing.value = false
    }
}

function openRejectModal(id: string) {
    selectedRouteId.value = id
    rejectReason.value = ''
    showRejectModal.value = true
}

async function handleReject() {
    if (!selectedRouteId.value || !rejectReason.value.trim()) return
    
    isProcessing.value = true
    try {
        await ModerationService.rejectRoute(selectedRouteId.value, rejectReason.value)
        routes.value = routes.value.filter(r => r.id !== selectedRouteId.value)
        showRejectModal.value = false
    } catch (e) {
        alert('Ошибка при отклонении')
    } finally {
        isProcessing.value = false
    }
}

function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit'
    })
}

onMounted(load)
</script>

<template>
    <div class="moderation-view">
        <div class="page-title-row">
            <div class="title-with-back">
                <FpBackButton to="/profile" />
                <div class="title-group">
                    <h1 class="page-title">Модерация</h1>
                    <p class="page-subtitle">Проверка новых маршрутов</p>
                </div>
            </div>
        </div>

        <div v-if="isLoading" class="loading-state">
            <FpSpinner />
            <p>Загрузка очереди...</p>
        </div>

        <div v-else-if="error" class="empty-state">
            <p>{{ error }}</p>
            <FpButton @click="load">Попробовать снова</FpButton>
        </div>

        <div v-else-if="routes.length === 0" class="empty-state">
            <div class="empty-icon">🎉</div>
            <h3>Очередь пуста</h3>
            <p>Все маршруты проверены</p>
        </div>

        <div v-else class="routes-list">
            <div v-for="route in routes" :key="route.id" class="route-moderation-card">
                <FpCard>
                    <div class="card-header">
                        <div class="route-info">
                            <h3>{{ route.title }}</h3>
                            <div class="meta">
                                <span class="author"><User :size="14" /> {{ route.author_name }}</span>
                                <span class="date"><Clock :size="14" /> {{ formatDate(route.created_at) }}</span>
                            </div>
                        </div>
                        <FpButton variant="text" size="sm" @click="router.push(`/routes/${route.id}`)">
                            Просмотр <ChevronRight :size="16" />
                        </FpButton>
                    </div>

                    <p class="description">{{ route.description }}</p>

                    <div class="stats-row">
                        <div class="stat">
                            <MapPin :size="16" />
                            <span>{{ route.checkpoints_count }} точек</span>
                        </div>
                        <div class="difficulty" :class="route.difficulty">
                            {{ route.difficulty === 'easy' ? 'Легко' : route.difficulty === 'medium' ? 'Средне' : 'Сложно' }}
                        </div>
                    </div>

                    <div class="card-actions">
                        <FpButton variant="danger" class="action-btn" @click="openRejectModal(route.id)">
                            <X :size="20" /> Отклонить
                        </FpButton>
                        <FpButton variant="primary" class="action-btn" @click="handleApprove(route.id)">
                            <Check :size="20" /> Одобрить
                        </FpButton>
                    </div>
                </FpCard>
            </div>
        </div>

        <FpConfirmationModal
            v-model:visible="showRejectModal"
            title="Причина отклонения"
            message="Укажите автору, что нужно исправить в маршруте"
            confirmText="Отклонить"
            variant="danger"
            :disabled="!rejectReason.trim() || isProcessing"
            @confirm="handleReject"
        >
            <template #default>
                <div style="margin-top: 16px;">
                    <FpInput 
                        v-model="rejectReason" 
                        placeholder="Например: Точка #2 недоступна" 
                        autofocus
                    />
                </div>
            </template>
        </FpConfirmationModal>
    </div>
</template>

<style scoped lang="scss">
.moderation-view {
    min-height: 100vh;
    padding-bottom: 40px;
}

.loading-state, .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    gap: 16px;

    h3 {
        margin: 0;
        font-size: 20px;
    }

    p {
        color: var(--color-text-tertiary);
        margin: 0;
    }

    .empty-icon {
        font-size: 48px;
    }
}

.routes-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
    margin-top: 8px;
}

.route-moderation-card {
    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 12px;

        h3 {
            margin: 0 0 4px 0;
            font-size: 18px;
            font-weight: 700;
        }

        .meta {
            display: flex;
            gap: 12px;
            font-size: 12px;
            color: var(--color-text-tertiary);

            span {
                display: flex;
                align-items: center;
                gap: 4px;
            }
        }
    }

    .description {
        font-size: 14px;
        color: var(--color-text-secondary);
        margin: 0 0 16px 0;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .stats-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid var(--color-border);

        .stat {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 13px;
            color: var(--color-text-primary);
            font-weight: 600;
        }

        .difficulty {
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 800;
            padding: 2px 8px;
            border-radius: 4px;
            background: var(--color-background);

            &.easy { color: var(--color-success); }
            &.medium { color: var(--color-warning); }
            &.hard { color: var(--color-error); }
        }
    }

    .card-actions {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;

        .action-btn {
            width: 100%;
        }
    }
}
</style>
