<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useRoutesStore } from '../state/useRoutesStore'
import { routeService } from '../services/routeService'
import { authStore } from '@/modules/auth/store/authStore'
import { FpBackButton, FpInput, FpButton, FpSpinner } from '@/design-system'
import { Save, Plus, Trash2 } from 'lucide-vue-next'

const router = useRouter()
const { fetchRoutes } = useRoutesStore()

const title = ref('')
const description = ref('')
const difficulty = ref<'easy' | 'medium' | 'hard'>('medium')
const isSaving = ref(false)

const checkpoints = ref([
  { title: '', description: '', lat: 0, lng: 0, order_index: 0 }
])

const addCheckpoint = () => {
  checkpoints.value.push({
    title: '',
    description: '',
    lat: 0,
    lng: 0,
    order_index: checkpoints.value.length
  })
}

const removeCheckpoint = (index: number) => {
  checkpoints.value.splice(index, 1)
  // Re-order
  checkpoints.value.forEach((cp, i) => cp.order_index = i)
}

const handleSave = async () => {
  if (!title.value) return
  if (!authStore.user.value) return

  isSaving.value = true
  try {
    const newRoute = await routeService.createRoute({
      title: title.value,
      description: description.value,
      difficulty: difficulty.value,
      author_id: authStore.user.value.id,
      image_url: null
    })

    // Save checkpoints
    await Promise.all(checkpoints.value.map(cp => 
      routeService.createCheckpoint({
        ...cp,
        route_id: newRoute.id
      })
    ))

    await fetchRoutes()
    router.push('/routes')
  } catch (err) {
    console.error('Failed to save route:', err)
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <div class="create-route-view">
    <header class="header">
      <FpBackButton @click="router.back()" />
      <h1>Новый маршрут</h1>
    </header>

    <div class="form-content">
      <section class="basic-info">
        <FpInput 
          v-model="title" 
          label="Название маршрута" 
          placeholder="Например: Тайны центра"
        />
        <div class="input-group">
          <label>Описание</label>
          <textarea v-model="description" placeholder="О чем этот маршрут..."></textarea>
        </div>
        
        <div class="input-group">
          <label>Сложность</label>
          <div class="difficulty-picker">
            <button 
              v-for="d in ['easy', 'medium', 'hard'] as const" 
              :key="d"
              :class="{ active: difficulty === d, [d]: true }"
              @click="difficulty = d"
            >
              {{ d === 'easy' ? 'Легко' : d === 'medium' ? 'Средне' : 'Сложно' }}
            </button>
          </div>
        </div>
      </section>

      <section class="checkpoints-section">
        <div class="section-header">
          <h2>Точки маршрута</h2>
          <FpButton variant="text" size="sm" @click="addCheckpoint">
            <Plus :size="20" /> Добавить
          </FpButton>
        </div>

        <div class="cp-list">
          <div v-for="(cp, index) in checkpoints" :key="index" class="cp-form-card">
            <div class="cp-header">
              <span class="cp-number">{{ index + 1 }}</span>
              <button class="delete-cp" @click="removeCheckpoint(index)">
                <Trash2 :size="18" />
              </button>
            </div>
            
            <FpInput v-model="cp.title" label="Название точки" />
            <FpInput v-model="cp.description" label="Задание/Описание" />
            
            <div class="lat-lng-row">
               <FpInput v-model.number="cp.lat" type="number" label="Широта (Lat)" />
               <FpInput v-model.number="cp.lng" type="number" label="Долгота (Lng)" />
            </div>
          </div>
        </div>
      </section>
    </div>

    <div class="actions">
      <FpButton 
        class="save-btn" 
        :disabled="isSaving || !title" 
        @click="handleSave"
      >
        <FpSpinner v-if="isSaving" size="sm" />
        <template v-else>
          <Save :size="20" /> Сохранить маршрут
        </template>
      </FpButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
.create-route-view {
  min-height: 100vh;
  background: var(--color-background);
  padding-bottom: 100px;
}

.header {
  padding: 20px;
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

.form-content {
  padding: 20px;
}

.basic-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: var(--color-surface);
  padding: 20px;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  margin-bottom: 32px;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 14px;
    font-weight: 700;
    color: var(--color-text-secondary);
  }

  textarea {
    min-height: 100px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    padding: 12px;
    font-family: inherit;
    font-size: 16px;
    resize: none;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }
}

.difficulty-picker {
  display: flex;
  gap: 8px;

  button {
    flex: 1;
    padding: 10px;
    border-radius: var(--radius-md);
    border: 1.5px solid var(--color-border);
    background: var(--color-surface);
    font-weight: 700;
    font-size: 13px;
    cursor: pointer;
    transition: all 0.2s;

    &.active {
      color: white;
      border-color: transparent;

      &.easy { background: var(--color-success); }
      &.medium { background: var(--color-warning); }
      &.hard { background: var(--color-error); }
    }
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;

  h2 {
    font-size: 18px;
    font-weight: 800;
    margin: 0;
  }
}

.cp-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-form-card {
  background: var(--color-surface);
  padding: 16px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cp-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.cp-number {
  width: 28px;
  height: 28px;
  background: var(--color-primary);
  color: var(--color-on-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 14px;
}

.delete-cp {
  background: none;
  border: none;
  color: var(--color-error);
  cursor: pointer;
  padding: 4px;
}

.lat-lng-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.actions {
  position: fixed;
  bottom: 24px;
  left: 20px;
  right: 20px;
  z-index: 100;
}

.save-btn {
  width: 100%;
  height: 56px;
  font-size: 18px;
  font-weight: 800;
  box-shadow: var(--shadow-3);
}
</style>
