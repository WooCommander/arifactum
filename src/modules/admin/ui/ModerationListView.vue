<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ModerationService, type ModerationRoute } from '../services/ModerationService'
import { ReportsService, type Report } from '../services/ReportsService'
import { FpBackButton, FpCard, FpButton, FpSpinner, FpConfirmationModal, FpInput } from '@/design-system'
import { Clock, MapPin, User, ChevronRight, Check, X, AlertTriangle, MessageSquare } from 'lucide-vue-next'

const router = useRouter()
const routes = ref<ModerationRoute[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const isProcessing = ref(false)

const showRejectModal = ref(false)
const selectedRouteId = ref<string | null>(null)
const rejectReason = ref('')

// Tabs state
const activeTab = ref<'routes' | 'reports'>('routes')
const reports = ref<Report[]>([])

async function load() {
    isLoading.value = true
    try {
        const [routesData, reportsData] = await Promise.all([
            ModerationService.getPendingRoutes(),
            ReportsService.getActiveReports()
        ])
        routes.value = routesData
        reports.value = reportsData
    } catch (e: any) {
        error.value = 'Ошибка загрузки данных'
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

async function handleResolveReport(id: string, action: 'resolved' | 'ignored') {
    isProcessing.value = true
    try {
        await ReportsService.resolveReport(id, action)
        reports.value = reports.value.filter(r => r.id !== id)
    } catch (e) {
        alert('Ошибка при обработке жалобы')
    } finally {
        isProcessing.value = false
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

        <div class="tabs-row">
            <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'routes' }"
                @click="activeTab = 'routes'"
            >
                Маршруты
                <span class="badge" v-if="routes.length">{{ routes.length }}</span>
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'reports' }"
                @click="activeTab = 'reports'"
            >
                Жалобы
                <span class="badge danger" v-if="reports.length">{{ reports.length }}</span>
            </button>
        </div>

        <div v-if="isLoading" class="loading-state">
            <FpSpinner />
            <p>Загрузка очереди...</p>
        </div>

        <div v-else-if="error" class="empty-state">
            <p>{{ error }}</p>
            <FpButton @click="load">Попробовать снова</FpButton>
        </div>

        <!-- Routes Tab -->
        <div v-else-if="activeTab === 'routes'">
            <div v-if="routes.length === 0" class="empty-state">
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
        </div>

        <!-- Reports Tab -->
        <div v-else-if="activeTab === 'reports'">
            <div v-if="reports.length === 0" class="empty-state">
                <div class="empty-icon">🛡️</div>
                <h3>Жалоб нет</h3>
                <p>Сообщество довольно контентом</p>
            </div>

            <div v-else class="reports-list">
                <div v-for="report in reports" :key="report.id" class="report-card-item">
                    <FpCard>
                        <div class="report-header">
                            <div class="report-target">
                                <div class="target-label">Жалоба на маршрут:</div>
                                <h3 @click="router.push(`/routes/${report.route_id}`)">{{ report.route_title }} <ChevronRight :size="16" /></h3>
                            </div>
                            <div class="report-meta">
                                <span class="reporter"><User :size="14" /> от {{ report.reporter_name }}</span>
                                <span class="date">{{ formatDate(report.created_at) }}</span>
                            </div>
                        </div>

                        <div class="report-reason">
                            <AlertTriangle :size="18" class="reason-icon" />
                            <p>{{ report.reason }}</p>
                        </div>

                        <div class="card-actions">
                            <FpButton variant="text" class="action-btn" @click="handleResolveReport(report.id, 'ignored')">
                                Игнорировать
                            </FpButton>
                            <FpButton variant="danger" class="action-btn" @click="handleResolveReport(report.id, 'resolved')">
                                <Check :size="20" /> Исправлено
                            </FpButton>
                        </div>
                    </FpCard>
                </div>
            </div>
        </div>

        <FpConfirmationModal
            v-model:visible="showRejectModal"
            title="Причина отклонения"
            message="Укажите автору, что нужно исправить в маршруте"
            confirmText="Отклонить"
            variant="danger"
            :confirmDisabled="!rejectReason.trim() || isProcessing"
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

.tabs-row {
    display: flex;
    gap: 8px;
    margin-bottom: 24px;
    padding: 4px;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);

    .tab-btn {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: var(--color-text-tertiary);
        font-weight: 700;
        font-size: 14px;
        transition: all 0.2s ease;
        cursor: pointer;

        &.active {
            background: var(--color-surface);
            color: var(--color-text-primary);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .badge {
            font-size: 10px;
            background: var(--color-primary);
            color: white;
            padding: 2px 6px;
            border-radius: 6px;
            
            &.danger {
                background: var(--color-error);
            }
        }
    }
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

.reports-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.report-card-item {
    .report-header {
        margin-bottom: 16px;

        .report-target {
            .target-label {
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
                color: var(--color-text-tertiary);
                margin-bottom: 4px;
            }
            h3 {
                margin: 0;
                font-size: 18px;
                font-weight: 800;
                color: var(--color-primary);
                display: flex;
                align-items: center;
                gap: 4px;
                cursor: pointer;
            }
        }

        .report-meta {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 12px;
            color: var(--color-text-tertiary);

            .reporter {
                display: flex;
                align-items: center;
                gap: 4px;
            }
        }
    }

    .report-reason {
        background: rgba(var(--color-error-rgb), 0.05);
        border: 1px solid rgba(var(--color-error-rgb), 0.1);
        border-radius: 12px;
        padding: 12px;
        display: flex;
        gap: 12px;
        margin-bottom: 20px;

        .reason-icon {
            color: var(--color-error);
            flex-shrink: 0;
            margin-top: 2px;
        }

        p {
            margin: 0;
            font-size: 14px;
            line-height: 1.5;
            color: var(--color-text-primary);
        }
    }
}
</style>
