<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useTeamsStore } from '../state/useTeamsStore'
import TeamCard from './TeamCard.vue'
import { FpButton, FpInput, FpSpinner, FpConfirmationModal } from '@/design-system'
import { Plus, PersonStanding, LogIn } from 'lucide-vue-next'
const { myTeams, isLoading, error, fetchMyTeams, createTeam, joinTeam, leaveTeam, deleteTeam } = useTeamsStore()

const showCreateModal = ref(false)
const showJoinModal = ref(false)
const showLeaveConfirm = ref(false)
const showDeleteConfirm = ref(false)
const selectedTeamId = ref<string | null>(null)

const newTeamName = ref('')
const inviteCode = ref('')
const isSubmitting = ref(false)

onMounted(() => {
  fetchMyTeams()
})

const handleCreateTeam = async () => {
  if (!newTeamName.value) return
  isSubmitting.value = true
  try {
    await createTeam(newTeamName.value)
    newTeamName.value = ''
    showCreateModal.value = false
  } finally {
    isSubmitting.value = false
  }
}

const handleJoinTeam = async () => {
  if (!inviteCode.value) return
  isSubmitting.value = true
  try {
    await joinTeam(inviteCode.value)
    inviteCode.value = ''
    showJoinModal.value = false
  } finally {
    isSubmitting.value = false
  }
}

const onLeave = (id: string) => {
  selectedTeamId.value = id
  showLeaveConfirm.value = true
}

const onDelete = (id: string) => {
  selectedTeamId.value = id
  showDeleteConfirm.value = true
}

const confirmLeave = async () => {
  if (selectedTeamId.value) {
    await leaveTeam(selectedTeamId.value)
    selectedTeamId.value = null
  }
}

const confirmDelete = async () => {
  if (selectedTeamId.value) {
    await deleteTeam(selectedTeamId.value)
    selectedTeamId.value = null
  }
}
</script>

<template>
  <div class="teams-view">
    <div class="page-title-row">
      <div class="title-with-back">

        <div class="title-group">
          <h1 class="page-title">Мои команды</h1>
          <p class="page-subtitle">Твои друзья и соратники</p>
        </div>
      </div>
    </div>

    <div class="content">
      <div v-if="error" class="error-banner">
        {{ error }}
        <FpButton variant="text" size="sm" @click="error = null">✕</FpButton>
      </div>

      <div v-if="isLoading && !myTeams.length" class="loading-state">
        <FpSpinner size="lg" />
        <p>Загрузка команд...</p>
      </div>

      <div v-else-if="!myTeams.length" class="empty-state">
        <div class="empty-icon">
          <PersonStanding :size="64" />
        </div>
        <h2>Вы пока не в команде</h2>
        <p>Создайте свою команду или вступите по коду приглашения.</p>

        <div class="empty-actions">
          <FpButton @click="showCreateModal = true">
            <Plus :size="20" /> Создать команду
          </FpButton>
          <FpButton variant="text" @click="showJoinModal = true">
            <LogIn :size="20" /> Вступить по коду
          </FpButton>
        </div>
      </div>

      <div v-else class="teams-list">
        <div class="list-header">
          <FpButton size="sm" @click="showCreateModal = true">
            <Plus :size="18" /> Новая
          </FpButton>
          <FpButton variant="text" size="sm" @click="showJoinModal = true">
            <LogIn :size="18" /> Вступить
          </FpButton>
        </div>

        <TeamCard v-for="team in myTeams" :key="team.id" :team="team" @leave="onLeave" @delete="onDelete" />
      </div>
    </div>

    <!-- Modals -->
    <FpConfirmationModal
      v-model:visible="showLeaveConfirm"
      title="Выход из команды"
      message="Вы уверены, что хотите выйти из команды?"
      confirm-text="Выйти"
      @confirm="confirmLeave"
    />

    <FpConfirmationModal
      v-model:visible="showDeleteConfirm"
      title="Удаление команды"
      message="Вы уверены, что хотите УДАЛИТЬ команду? Это действие необратимо, все участники будут исключены."
      confirm-text="Удалить"
      variant="danger"
      @confirm="confirmDelete"
    />

    <div v-if="showCreateModal || showJoinModal" class="modal-overlay"
      @click="showCreateModal = false; showJoinModal = false">
      <div class="modal-content" @click.stop>
        <template v-if="showCreateModal">
          <h2>Создание команды</h2>
          <p>Придумайте крутое название для ваших приключений</p>
          <FpInput v-model="newTeamName" label="Название команды" placeholder="Например: Альфа" />
          <FpButton :disabled="isSubmitting || !newTeamName" @click="handleCreateTeam">
            <FpSpinner v-if="isSubmitting" size="sm" />
            <span v-else>Создать</span>
          </FpButton>
        </template>

        <template v-else-if="showJoinModal">
          <h2>Вступление в команду</h2>
          <p>Введите код, который вам прислал лидер команды</p>
          <FpInput v-model="inviteCode" label="Код приглашения" placeholder="XXXXXX" />
          <FpButton :disabled="isSubmitting || !inviteCode" @click="handleJoinTeam">
            <FpSpinner v-if="isSubmitting" size="sm" />
            <span v-else>Вступить</span>
          </FpButton>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.teams-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--color-background);
  overflow: hidden;
}

.page-title-row {
  padding: var(--spacing-lg) var(--spacing-md) var(--spacing-md);
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  flex-shrink: 0;
}

.title-group {
  .page-title {
    font-size: 24px;
    font-weight: 900;
    margin: 0;
    background: linear-gradient(135deg, var(--color-primary), #8e44ad);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .page-subtitle {
    font-size: 14px;
    color: var(--color-text-secondary);
    margin: 4px 0 0;
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: var(--spacing-md);
  padding-bottom: 100px; // Место для навигации
  
  &::-webkit-scrollbar {
    width: 0;
  }
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--color-text-secondary);

  h2 {
    margin: 16px 0 8px;
    color: var(--color-text-primary);
  }
}

.empty-icon {
  width: 100px;
  height: 100px;
  background: var(--color-surface-hover);
  border-radius: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  border: 2px solid var(--color-border);
  transform: rotate(-5deg);
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
  width: 100%;
  max-width: 240px;
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.list-header {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 8px;
  position: sticky;
  top: 0;
  z-index: 10;
  background: var(--color-background);
  padding: 8px 0;
}

.error-banner {
  background: rgba(var(--color-error-rgb), 0.1);
  border: 1px solid var(--color-error);
  color: var(--color-error);
  padding: 12px;
  border-radius: var(--radius-md);
  margin-bottom: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
}

// Modal
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  z-index: 9999; // Поверх всего
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: var(--color-surface);
  width: 100%;
  max-width: 400px;
  padding: 28px;
  border-radius: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);

  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 900;
    color: var(--color-text-primary);
  }

  p {
    margin: -12px 0 0;
    font-size: 14px;
    color: var(--color-text-secondary);
  }
}

@keyframes slideUp {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
