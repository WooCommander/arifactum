<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ModerationService, type ModerationRoute } from '../services/ModerationService'
import { ReportsService, type Report } from '../services/ReportsService'
import { AdminService, type ProjectStats } from '../services/AdminService'
import { FpBackButton, FpCard, FpButton, FpSpinner, FpConfirmationModal, FpInput } from '@/design-system'
import { Clock, MapPin, User as UserIcon, ChevronRight, Check, X, AlertTriangle, MessageSquare, Activity, Users, ShieldAlert, Search } from 'lucide-vue-next'

const router = useRouter()
const routes = ref<ModerationRoute[]>([])
const isLoading = ref(true)
const error = ref<string | null>(null)

const isProcessing = ref(false)

const showRejectModal = ref(false)
const selectedRouteId = ref<string | null>(null)
const rejectReason = ref('')

// Tabs state
const activeTab = ref<'stats' | 'routes' | 'reports' | 'users'>('stats')
const reports = ref<Report[]>([])
const stats = ref<ProjectStats | null>(null)

// Users management
const userSearchQuery = ref('')
const foundUsers = ref<any[]>([])
const isSearchingUsers = ref(false)
const showUserBlockModal = ref(false)
const selectedUser = ref<any>(null)
const userBlockReason = ref('')

async function load() {
    isLoading.value = true
    try {
        const [routesData, reportsData, statsData] = await Promise.all([
            ModerationService.getPendingRoutes(),
            ReportsService.getActiveReports(),
            AdminService.getProjectStats()
        ])
        routes.value = routesData
        reports.value = reportsData
        stats.value = statsData
    } catch (e: any) {
        error.value = 'Ошибка загрузки данных'
        console.error(e)
    } finally {
        isLoading.value = false
    }
}

async function handleSearchUsers() {
    if (!userSearchQuery.value.trim()) return
    isSearchingUsers.value = true
    try {
        foundUsers.value = await AdminService.searchUsers(userSearchQuery.value)
    } catch (e) {
        alert('Ошибка поиска')
    } finally {
        isSearchingUsers.value = false
    }
}

async function handleBlockUser() {
    if (!selectedUser.value || !userBlockReason.value.trim()) return
    isProcessing.value = true
    try {
        await AdminService.blockUser(selectedUser.value.id, userBlockReason.value)
        selectedUser.value.is_blocked = true
        showUserBlockModal.value = false
        userBlockReason.value = ''
    } catch (e) {
        alert('Ошибка блокировки')
    } finally {
        isProcessing.value = false
    }
}

async function handleUnblockUser(userId: string) {
    isProcessing.value = true
    try {
        await AdminService.unblockUser(userId)
        const user = foundUsers.value.find(u => u.id === userId)
        if (user) user.is_blocked = false
    } catch (e) {
        alert('Ошибка разблокировки')
    } finally {
        isProcessing.value = false
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

async function handleBlockRoute(report: Report) {
    if (!confirm(`Вы действительно хотите заблокировать маршрут "${report.route_title}"?`)) return
    isProcessing.value = true
    try {
        await AdminService.toggleRouteBlock(report.route_id, true)
        await ReportsService.resolveReport(report.id, 'resolved')
        reports.value = reports.value.filter(r => r.id !== report.id)
        alert('Маршрут заблокирован')
    } catch (e) {
        alert('Ошибка блокировки маршрута')
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
                :class="{ active: activeTab === 'stats' }"
                @click="activeTab = 'stats'"
            >
                <Activity :size="18" /> Статистика
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'routes' }"
                @click="activeTab = 'routes'"
            >
                <Check :size="18" /> Маршруты
                <span class="badge" v-if="routes.length">{{ routes.length }}</span>
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'reports' }"
                @click="activeTab = 'reports'"
            >
                <AlertTriangle :size="18" /> Жалобы
                <span class="badge danger" v-if="reports.length">{{ reports.length }}</span>
            </button>
            <button 
                class="tab-btn" 
                :class="{ active: activeTab === 'users' }"
                @click="activeTab = 'users'"
            >
                <Users :size="18" /> Юзеры
            </button>
        </div>

        <div v-if="isLoading" class="loading-state">
            <FpSpinner />
            <p>Загрузка данных...</p>
        </div>

        <!-- Stats Tab -->
        <div v-else-if="activeTab === 'stats' && stats" class="stats-tab">
            <div class="stats-grid">
                <FpCard class="stat-card">
                    <div class="stat-icon users"><Users :size="24" /></div>
                    <div class="stat-info">
                        <div class="stat-value">{{ stats.totalUsers }}</div>
                        <div class="stat-label">Всего игроков</div>
                    </div>
                </FpCard>
                <FpCard class="stat-card">
                    <div class="stat-icon routes"><MapPin :size="24" /></div>
                    <div class="stat-info">
                        <div class="stat-value">{{ stats.totalRoutes }}</div>
                        <div class="stat-label">Маршрутов</div>
                    </div>
                </FpCard>
                <FpCard class="stat-card">
                    <div class="stat-icon success"><Check :size="24" /></div>
                    <div class="stat-info">
                        <div class="stat-value">{{ stats.totalCompletions }}</div>
                        <div class="stat-label">Завершений</div>
                    </div>
                </FpCard>
                <FpCard class="stat-card">
                    <div class="stat-icon warning"><Activity :size="24" /></div>
                    <div class="stat-info">
                        <div class="stat-value">{{ stats.activeToday }}</div>
                        <div class="stat-label">Активность сегодня</div>
                    </div>
                </FpCard>
            </div>
        </div>

        <!-- Users Tab -->
        <div v-else-if="activeTab === 'users'" class="users-tab">
            <div class="search-bar">
                <FpInput 
                    v-model="userSearchQuery" 
                    placeholder="Поиск по имени или email..." 
                    @keyup.enter="handleSearchUsers"
                />
                <FpButton variant="primary" :disabled="isSearchingUsers" @click="handleSearchUsers">
                    <Search :size="18" />
                </FpButton>
            </div>

            <div v-if="foundUsers.length === 0 && !isSearchingUsers" class="empty-state">
                <div class="empty-icon">🔍</div>
                <p>Найдите пользователя для управления</p>
            </div>

            <div v-else class="users-list">
                <div v-for="u in foundUsers" :key="u.id" class="user-card-item">
                    <FpCard :class="{ 'blocked': u.is_blocked }">
                        <div class="user-row">
                            <div class="user-main">
                                <div class="user-avatar-mini" :style="u.avatar_url ? `background-image: url(${u.avatar_url})` : ''">
                                    {{ !u.avatar_url ? (u.display_name?.[0] || '?') : '' }}
                                </div>
                                <div class="user-details">
                                    <h3>{{ u.display_name }}</h3>
                                    <span class="role">{{ u.role }}</span>
                                </div>
                            </div>
                            
                            <div class="user-actions">
                                <FpButton v-if="!u.is_blocked" variant="danger" size="sm" @click="selectedUser = u; showUserBlockModal = true">
                                    Блокировать
                                </FpButton>
                                <FpButton v-else variant="primary" size="sm" @click="handleUnblockUser(u.id)">
                                    Разблокировать
                                </FpButton>
                            </div>
                        </div>
                        <div v-if="u.is_blocked" class="block-info">
                            <ShieldAlert :size="14" /> Заблокирован: {{ u.block_reason }}
                        </div>
                    </FpCard>
                </div>
            </div>
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
                                    <span class="author"><UserIcon :size="14" /> {{ route.author_name }}</span>
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
                                <span class="reporter"><UserIcon :size="14" /> от {{ report.reporter_name }}</span>
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
                            <FpButton variant="danger" class="action-btn" @click="handleBlockRoute(report)">
                                <ShieldAlert :size="18" /> Заблокировать
                            </FpButton>
                            <FpButton variant="primary" class="action-btn" @click="handleResolveReport(report.id, 'resolved')">
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

        <!-- User Block Modal -->
        <FpConfirmationModal
            v-model:visible="showUserBlockModal"
            title="Блокировка пользователя"
            message="Укажите причину блокировки. Пользователь увидит её при входе."
            confirmText="Заблокировать"
            variant="danger"
            :confirmDisabled="!userBlockReason.trim() || isProcessing"
            @confirm="handleBlockUser"
        >
            <template #default>
                <div style="margin-top: 16px;">
                    <FpInput 
                        v-model="userBlockReason" 
                        placeholder="Например: Нарушение правил сообщества" 
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
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    &::-webkit-scrollbar { display: none; }

    .tab-btn {
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border-radius: 8px;
        border: none;
        background: transparent;
        color: var(--color-text-tertiary);
        font-weight: 700;
        font-size: 14px;
        transition: all 0.2s ease;
        cursor: pointer;
        white-space: nowrap;

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

.stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-bottom: 24px;
}

.stat-card {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;

    .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        
        &.users { background: rgba(59, 130, 246, 0.1); color: #3b82f6; }
        &.routes { background: rgba(168, 85, 247, 0.1); color: #a855f7; }
        &.success { background: rgba(34, 197, 94, 0.1); color: #22c55e; }
        &.warning { background: rgba(245, 158, 11, 0.1); color: #f59e0b; }
    }

    .stat-value {
        font-size: 24px;
        font-weight: 900;
        line-height: 1;
    }

    .stat-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: var(--color-text-tertiary);
        margin-top: 4px;
    }
}

.search-bar {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;

    & > * {
        &:first-child { flex: 1; }
    }
}

.user-card-item {
    margin-bottom: 12px;
    
    .blocked {
        border: 1px solid rgba(var(--color-error-rgb), 0.3);
        background: rgba(var(--color-error-rgb), 0.02);
    }

    .user-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .user-main {
        display: flex;
        align-items: center;
        gap: 12px;
    }

    .user-avatar-mini {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        background: var(--color-background);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 800;
        background-size: cover;
    }

    .user-details {
        h3 {
            margin: 0;
            font-size: 15px;
            font-weight: 700;
        }
        .role {
            font-size: 11px;
            text-transform: uppercase;
            color: var(--color-text-tertiary);
        }
    }

    .block-info {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid var(--color-border);
        font-size: 12px;
        color: var(--color-error);
        display: flex;
        align-items: center;
        gap: 6px;
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
        grid-template-columns: 1fr 1fr 1fr;
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
