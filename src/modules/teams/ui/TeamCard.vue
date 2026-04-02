<script setup lang="ts">
import type { TeamWithMembers } from '../types'
import { FpCard, FpButton } from '@/design-system'
import { Users, LogOut, Copy } from 'lucide-vue-next'

interface Props {
  team: TeamWithMembers
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (e: 'leave', id: string): void
}>()

const copyInviteCode = () => {
  navigator.clipboard.writeText(props.team.invite_code)
  alert('Код приглашения скопирован!')
}
</script>

<template>
  <FpCard class="team-card">
    <div class="team-info">
      <div class="team-avatar">
        <Users v-if="!team.avatar_url" :size="32" />
        <img v-else :src="team.avatar_url" :alt="team.name" />
      </div>
      <div class="team-details">
        <h3>{{ team.name }}</h3>
        <p class="stats">
          <Users :size="14" /> {{ team.members_count }} участников
          <span v-if="team.is_leader" class="badge">Лидер</span>
        </p>
      </div>
    </div>

    <div class="team-actions">
      <div class="invite-section">
        <span class="code-label">Код:</span>
        <code class="invite-code">{{ team.invite_code }}</code>
        <FpButton variant="text" size="sm" @click="copyInviteCode">
          <Copy :size="16" />
        </FpButton>
      </div>
      
      <FpButton 
        v-if="!team.is_leader" 
        variant="text" 
        size="sm" 
        class="leave-btn"
        @click="emit('leave', team.id)"
      >
        <LogOut :size="18" />
      </FpButton>
    </div>
  </FpCard>
</template>

<style scoped lang="scss">
.team-card {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.team-info {
  display: flex;
  gap: 16px;
  align-items: center;
}

.team-avatar {
  width: 56px;
  height: 56px;
  border-radius: var(--radius-md);
  background: var(--color-surface-hover);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.team-details {
  h3 {
    font-size: 18px;
    font-weight: 800;
    margin: 0 0 4px;
    color: var(--color-text-primary);
  }

  .stats {
    font-size: 13px;
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.badge {
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  font-weight: 800;
  text-transform: uppercase;
}

.team-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid var(--color-border);
}

.invite-section {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--color-surface-hover);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px dashed var(--color-border);
}

.code-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--color-text-secondary);
}

.invite-code {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 800;
  color: var(--color-primary);
  letter-spacing: 1px;
}

.leave-btn {
  color: var(--color-error);
}
</style>
