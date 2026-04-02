<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useTeamsStore } from '../state/useTeamsStore'
import TeamCard from './TeamCard.vue'
import { FpBackButton, FpButton, FpInput, FpSpinner } from '@/design-system'
import { Plus, PersonStanding, LogIn } from 'lucide-vue-next'

const router = useRouter()
const { myTeams, isLoading, error, fetchMyTeams, createTeam, joinTeam, leaveTeam } = useTeamsStore()

const showCreateModal = ref(false)
const showJoinModal = ref(false)
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

const onLeave = async (id: string) => {
  if (confirm('Вы уверены, что хотите выйти из команды?')) {
    await leaveTeam(id)
  }
}
</script>

<template>
  <div class="teams-view">
    <header class="header">
      <FpBackButton @click="router.back()" />
      <h1>Мои команды</h1>
    </header>

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
        <div class="empty-icon"><PersonStanding :size="64" /></div>
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

        <TeamCard 
          v-for="team in myTeams" 
          :key="team.id" 
          :team="team" 
          @leave="onLeave"
        />
      </div>
    </div>

    <!-- Modals (Simple overlays for now) -->
    <div v-if="showCreateModal || showJoinModal" class="modal-overlay" @click="showCreateModal = false; showJoinModal = false">
      <div class="modal-content" @click.stop>
        <template v-if="showCreateModal">
          <h2>Создание команды</h2>
          <FpInput v-model="newTeamName" label="Название команды" placeholder="Например: Альфа" />
          <FpButton :disabled="isSubmitting || !newTeamName" @click="handleCreateTeam">
            <FpSpinner v-if="isSubmitting" size="sm" />
            <span v-else>Создать</span>
          </FpButton>
        </template>

        <template v-else-if="showJoinModal">
          <h2>Вступление в команду</h2>
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
  min-height: 100vh;
  background: var(--color-background);
}

.header {
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);

  h1 {
    font-size: 20px;
    font-weight: 800;
    margin: 0;
  }
}

.content {
  padding: 20px;
}

.loading-state, .empty-state {
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
  background: var(--color-surface);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  border: 4px solid var(--color-primary);
  opacity: 0.8;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.teams-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.list-header {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 8px;
}

// Modal
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: var(--color-surface);
  width: 100%;
  max-width: 400px;
  padding: 24px;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  gap: 20px;
  box-shadow: var(--shadow-xl);

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
  }
}
</style>
