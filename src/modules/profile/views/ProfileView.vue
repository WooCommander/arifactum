<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { Edit2 } from 'lucide-vue-next'
import { AuthService } from '@/modules/auth/services/AuthService'
import FpCard from '@/design-system/components/FpCard.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import { useNotify } from '@/composables/useNotify'
import { useI18n } from 'vue-i18n'
import { useRewardsStore } from '@/modules/rewards'

const { t, locale } = useI18n()
const { totalBonuses, fetchRewards } = useRewardsStore()
const router = useRouter()
const { notify } = useNotify()

interface UserStats {
  joinedDate: Date
  xp: number
  level: number
  levelTitle: string
  nextLevelThreshold: number
  totalDistance: number
  routesCompleted: number
}

const isLoading = ref(true)
const stats = ref<UserStats | null>(null)
const activityFeed = ref<any[]>([])
const user = ref({ email: '', id: '' })
const displayName = ref('')

interface PersonalProfile {
  first_name: string
  last_name: string
  gender: string
  birth_date: string
}

const profile = ref<PersonalProfile>({ first_name: '', last_name: '', gender: '', birth_date: '' })
const profileEdit = ref<PersonalProfile>({ first_name: '', last_name: '', gender: '', birth_date: '' })
const isEditingProfile = ref(false)
const isSavingProfile = ref(false)

const genderOptions = computed(() => ([
  { value: 'male', label: t('profile.gender.male') },
  { value: 'female', label: t('profile.gender.female') }
]))

const savePersonalProfile = async () => {
  isSavingProfile.value = true
  try {
    await AuthService.saveProfile({
      first_name: profileEdit.value.first_name,
      last_name: profileEdit.value.last_name,
      gender: profileEdit.value.gender
    })
    profile.value = { ...profileEdit.value }
    displayName.value = profile.value.first_name
    isEditingProfile.value = false
    notify('Профиль обновлен', 'success')
  } catch (e) {
    notify('Ошибка сохранения', 'error')
  } finally {
    isSavingProfile.value = false
  }
}

const handleSignOut = async () => {
  try {
    await AuthService.signOut()
    router.push('/login')
  } catch (e) {
    notify('Ошибка при выходе', 'error')
  }
}

onMounted(async () => {
  try {
    const { user: authUser } = await AuthService.getUser()
    if (authUser) {
      user.value.email = authUser.email || ''
      user.value.id = authUser.id
    }

    const [rawStats, profileData, activity] = await Promise.all([
      AuthService.getUserStats(),
      AuthService.getProfile(),
      AuthService.getUserActivity()
    ])

    if (rawStats) stats.value = rawStats
    
    profile.value = {
      first_name: profileData.first_name || '',
      last_name: profileData.last_name || '',
      gender: profileData.gender || '',
      birth_date: profileData.birth_date || '',
    }
    profileEdit.value = { ...profile.value }
    displayName.value = profileData.display_name || profileData.first_name || ''
    activityFeed.value = activity
    
    await fetchRewards()
  } catch(err) {
      console.error('Profile load error', err)
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="profile-view">
    <!-- Header -->
    <section class="profile-header">
      <div class="avatar-container" @click="triggerAvatarUpload">
        <div v-if="isLoadingAvatar" class="avatar-loader">
          <div class="spinner"></div>
        </div>
        <img v-if="profile.avatar_url" :src="profile.avatar_url" class="avatar-img" />
        <div v-else class="avatar-placeholder">
          {{ user.email.charAt(0).toUpperCase() }}
        </div>
        <div class="avatar-edit-overlay">
          <Camera :size="16" />
        </div>
      </div>
      
      <input 
        type="file" 
        ref="avatarInput" 
        style="display: none" 
        accept="image/*" 
        @change="handleFileSelect"
      />

      <div class="user-info">
        <div v-if="!isEditingProfile" class="display-name-row">
          <h1>{{ displayName || user.email.split('@')[0] }}</h1>
        </div>
        <div v-else class="display-name-edit">
          <input 
            v-model="profileEdit.first_name" 
            class="name-input" 
            :placeholder="t('profile.personal.name')"
            maxlength="32" 
          />
        </div>
        <p class="email">{{ user.email }}</p>
        <div class="badges" v-if="stats">
          <span class="badge">⚡ {{ stats.xp }} XP</span>
          <span class="badge level-badge">Уровень {{ stats.level }}</span>
        </div>
      </div>
      <button class="settings-toggle" @click="isEditingProfile = !isEditingProfile">
        <Edit2 :size="20" />
      </button>
    </section>

    <!-- Stats Grid -->
    <section class="stats-grid" v-if="stats && !isEditingProfile">
      <FpCard class="stat-card">
        <div class="stat-value">{{ stats.totalDistance.toFixed(1) }}</div>
        <div class="stat-label">Километров</div>
      </FpCard>

      <FpCard class="stat-card">
        <div class="stat-value">{{ stats.routesCompleted }}</div>
        <div class="stat-label">Маршрутов</div>
      </FpCard>

      <FpCard class="stat-card">
        <div class="stat-value">{{ totalBonuses }}</div>
        <div class="stat-label">Бонусов</div>
      </FpCard>
    </section>

    <!-- Edit Profile Mode -->
    <section v-if="isEditingProfile" class="edit-profile-section">
      <FpCard class="info-card edit-mode">
        <div class="edit-field">
          <label class="field-label">{{ t('profile.labels.name') }}</label>
          <input v-model="profileEdit.first_name" class="field-input" placeholder="Имя" />
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('profile.labels.lastName') }}</label>
          <input v-model="profileEdit.last_name" class="field-input" placeholder="Фамилия" />
        </div>
        <div class="edit-field">
          <label class="field-label">{{ t('profile.labels.gender') }}</label>
          <div class="gender-options">
            <button 
              v-for="g in genderOptions" 
              :key="g.value" 
              class="gender-btn"
              :class="{ active: profileEdit.gender === g.value }"
              @click="profileEdit.gender = g.value"
            >
              {{ g.label }}
            </button>
          </div>
        </div>
        <div class="edit-actions">
          <FpButton variant="secondary" @click="isEditingProfile = false">Отмена</FpButton>
          <FpButton :loading="isSavingProfile" @click="savePersonalProfile">Сохранить</FpButton>
        </div>
      </FpCard>
    </section>

    <!-- Activity -->
    <section v-if="!isEditingProfile && activityFeed.length > 0" class="activity-section">
      <div class="section-title-row">
        <h2>Последняя активность</h2>
      </div>
      <div class="activity-list">
        <FpCard v-for="act in activityFeed" :key="act.id" class="activity-item" padding="sm">
          <div class="act-icon">{{ act.icon }}</div>
          <div class="act-content">
            <div class="act-header">
              <span class="act-action">{{ act.action }}</span>
              <span class="act-time">{{ act.time }}</span>
            </div>
            <span class="act-item">{{ act.item }}</span>
          </div>
        </FpCard>
      </div>
    </section>

    <!-- Bottom Actions -->
    <section class="profile-actions">
      <FpButton variant="outline" class="logout-btn" @click="handleSignOut">
        Выйти из аккаунта
      </FpButton>
    </section>
  </div>
</template>

<style scoped lang="scss">
.profile-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding: 20px;
  width: 100%;
}

.profile-header {
  display: flex;
  align-items: center;
  gap: 20px;
  background: var(--color-surface);
  padding: 20px;
  border-radius: 20px;
  border: 1px solid var(--color-border);
  position: relative;

  .avatar-container {
    position: relative;
    width: 64px;
    height: 64px;
    cursor: pointer;
    border-radius: 16px;
    overflow: hidden;
    
    &:hover .avatar-edit-overlay {
      opacity: 1;
    }
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    background: linear-gradient(135deg, var(--color-primary), #a29bfe);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    font-weight: 800;
  }

  .avatar-edit-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .avatar-loader {
    position: absolute;
    inset: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 2;

    .spinner {
      width: 20px;
      height: 20px;
      border: 2px solid var(--color-primary);
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .user-info {
    flex: 1;
    min-width: 0;

    h1 {
      margin: 0;
      font-size: 20px;
      font-weight: 800;
      color: var(--color-text-primary);
    }

    .email {
      font-size: 13px;
      color: var(--color-text-secondary);
      margin: 4px 0 10px;
    }

    .badges {
      display: flex;
      gap: 8px;

      .badge {
        padding: 4px 10px;
        background: var(--color-background);
        border: 1px solid var(--color-border);
        border-radius: 8px;
        font-size: 11px;
        font-weight: 700;
        color: var(--color-text-secondary);
      }
    }
  }

  .settings-toggle {
    background: none;
    border: none;
    color: var(--color-text-secondary);
    padding: 8px;
    cursor: pointer;
    transition: color 0.2s;

    &:hover {
      color: var(--color-primary);
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  .stat-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    text-align: center;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 16px;

    .stat-value {
      font-size: 22px;
      font-weight: 800;
      color: var(--color-primary);
    }

    .stat-label {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      color: var(--color-text-tertiary);
      margin-top: 4px;
    }
  }
}

.edit-profile-section {
  .edit-mode {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 20px;
  }

  .edit-field {
    display: flex;
    flex-direction: column;
    gap: 6px;

    .field-label {
      font-size: 12px;
      font-weight: 700;
      color: var(--color-text-secondary);
      text-transform: uppercase;
    }

    .field-input, .name-input {
      width: 100%;
      padding: 12px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-background);
      color: var(--color-text-primary);
      font-size: 15px;

      &:focus {
        outline: none;
        border-color: var(--color-primary);
      }
    }
  }

  .gender-options {
    display: flex;
    gap: 10px;

    .gender-btn {
      flex: 1;
      padding: 10px;
      border: 1px solid var(--color-border);
      border-radius: 12px;
      background: var(--color-surface);
      font-size: 14px;
      font-weight: 600;
      color: var(--color-text-secondary);
      cursor: pointer;

      &.active {
        border-color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 10%, transparent);
        color: var(--color-primary);
      }
    }
  }

  .edit-actions {
    display: flex;
    gap: 12px;
    margin-top: 8px;
    
    & > * {
      flex: 1;
    }
  }
}

.activity-section {
  h2 {
    font-size: 16px;
    font-weight: 800;
    margin-bottom: 12px;
    color: var(--color-text-primary);
  }

  .activity-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .activity-item {
    display: flex;
    gap: 16px;
    align-items: center;
    padding: 12px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 14px;

    .act-icon {
      font-size: 20px;
    }

    .act-content {
      flex: 1;

      .act-header {
        display: flex;
        justify-content: space-between;
        
        .act-action {
          font-weight: 700;
          font-size: 13px;
          color: var(--color-text-primary);
        }

        .act-time {
          font-size: 11px;
          color: var(--color-text-tertiary);
        }
      }

      .act-item {
        font-size: 13px;
        color: var(--color-text-secondary);
      }
    }
  }
}

.profile-actions {
  margin-top: auto;
  padding: 10px 0;

  .logout-btn {
    width: 100%;
    color: var(--color-error);
    border-color: color-mix(in srgb, var(--color-error) 20%, transparent);
    
    &:hover {
      background: color-mix(in srgb, var(--color-error) 5%, transparent);
    }
  }
}
</style>
