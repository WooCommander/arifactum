<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSocialStore } from '../state/useSocialStore'
import { authStore } from '@/modules/auth/store/authStore'
import { FpSpinner } from '@/design-system'
import { MessageSquare, Send, ChevronDown, Trash2 } from 'lucide-vue-next'
import { useNotify } from '@/composables/useNotify'

interface Props {
  routeId: string
}

const props = defineProps<Props>()

const socialStore = useSocialStore()
const { notify } = useNotify()

const commentText = ref('')
const isSubmitting = ref(false)
const isExpanded = ref(false)

const currentUserId = computed(() => authStore.currentUserId.value)
const comments = computed(() => socialStore.comments.value)
const isLoading = computed(() => socialStore.isLoading.value)

const visibleComments = computed(() => {
  if (isExpanded.value) return comments.value
  return comments.value.slice(0, 3)
})

async function loadComments(): Promise<void> {
  if (!props.routeId) return
  await socialStore.fetchComments(props.routeId)
}

onMounted(() => {
  loadComments()
})

watch(() => props.routeId, () => {
  loadComments()
})

async function onSubmit(): Promise<void> {
  if (!commentText.value.trim() || !currentUserId.value) return

  isSubmitting.value = true
  try {
    await socialStore.addComment(props.routeId, currentUserId.value, commentText.value.trim())
    commentText.value = ''
    notify('Комментарий успешно добавлен', 'success')
  } catch (err) {
    notify('Ошибка при добавлении комментария', 'error')
  } finally {
    isSubmitting.value = false
  }
}

async function onDelete(commentId: string): Promise<void> {
  if (!confirm('Удалить комментарий?')) return

  try {
    await socialStore.deleteComment(commentId)
    notify('Комментарий удален', 'success')
  } catch (err) {
    notify('Ошибка при удалении комментария', 'error')
  }
}

function formatDate(dateInput: Date | string | number): string {
  if (!dateInput) return ''
  const date = new Date(dateInput)
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function toggleReaction(commentId: string, emoji: string): void {
  socialStore.toggleCommentReaction(commentId, emoji)
}
</script>

<template>
  <div class="route-comments">
    <div class="header-row">
      <div class="title-group">
        <MessageSquare :size="20" class="title-icon" />
        <h3 class="title">Комментарии <span class="count" v-if="comments.length">({{ comments.length }})</span></h3>
      </div>
      <div v-if="isLoading" class="spinner-wrap">
        <FpSpinner size="sm" />
      </div>
    </div>

    <!-- Поле ввода комментария -->
    <div class="input-box">
      <input
        v-model="commentText"
        type="text"
        class="comment-input"
        placeholder="Написать комментарий..."
        @keyup.enter="onSubmit"
      />
      <button
        class="send-btn"
        :class="{ 'is-active': commentText.trim().length > 0 }"
        :disabled="!commentText.trim() || isSubmitting"
        @click="onSubmit"
        title="Отправить"
      >
        <FpSpinner v-if="isSubmitting" size="sm" />
        <Send v-else :size="16" />
      </button>
    </div>

    <!-- Список комментариев -->
    <div class="comments-list" v-if="comments.length > 0">
      <transition-group name="comment-anim">
        <div v-for="comment in visibleComments" :key="comment.id" class="comment-item">
          <div class="comment-header">
            <div class="user-meta">
              <div
                class="avatar-circle"
                :style="comment.avatarUrl ? `background-image: url(${comment.avatarUrl})` : ''"
              >
                {{ !comment.avatarUrl ? (comment.userName?.[0]?.toUpperCase() || '?') : '' }}
              </div>
              <span class="user-name">{{ comment.userName }}</span>
              <span class="dot-separator">•</span>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            </div>

            <button
              v-if="currentUserId === comment.userId"
              class="delete-btn"
              @click="onDelete(comment.id)"
              title="Удалить комментарий"
            >
              <Trash2 :size="14" />
            </button>
          </div>

          <div class="comment-body">
            {{ comment.content }}
          </div>

          <div class="comment-footer">
            <div class="reactions-group">
              <button
                v-for="emoji in ['👍', '❤️', '🔥']"
                :key="emoji"
                class="reaction-pill"
                :class="{ 'is-reacted': comment.userReaction === emoji }"
                @click="toggleReaction(comment.id, emoji)"
              >
                <span class="emoji">{{ emoji }}</span>
                <span v-if="comment.reactions && comment.reactions[emoji] > 0" class="react-count">
                  {{ comment.reactions[emoji] }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </transition-group>

      <button
        v-if="comments.length > 3"
        class="toggle-expand-btn"
        @click="isExpanded = !isExpanded"
      >
        <span>{{ isExpanded ? 'Скрыть часть комментариев' : `Показать все комментарии (${comments.length})` }}</span>
        <ChevronDown :size="16" class="chevron-icon" :class="{ 'is-rotated': isExpanded }" />
      </button>
    </div>

    <!-- Состояние когда комментариев нет -->
    <div class="empty-comments" v-else-if="!isLoading">
      <p class="empty-msg">Пока нет комментариев. Станьте первым, кто поделится впечатлением!</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.route-comments {
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title-group {
    display: flex;
    align-items: center;
    gap: 10px;

    .title-icon {
      color: var(--color-primary);
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;

      .count {
        font-weight: 500;
        color: var(--color-text-tertiary);
        font-size: 16px;
      }
    }
  }

  .spinner-wrap {
    display: flex;
    align-items: center;
  }
}

.input-box {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  padding: 8px 12px 8px 20px;
  transition: all 0.2s ease;

  &:focus-within {
    background: rgba(255, 255, 255, 0.07);
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
  }

  .comment-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 15px;
    color: var(--color-text-primary);

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }

  .send-btn {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.08);
    color: var(--color-text-tertiary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: not-allowed;
    transition: all 0.2s ease;

    &.is-active {
      background: var(--color-primary);
      color: white;
      cursor: pointer;

      &:hover {
        transform: scale(1.05);
        box-shadow: 0 0 12px rgba(var(--color-primary-rgb), 0.4);
      }

      &:active {
        transform: scale(0.95);
      }
    }
  }
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.comment-item {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .user-meta {
      display: flex;
      align-items: center;
      gap: 10px;

      .avatar-circle {
        width: 26px;
        height: 26px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary, #9c27b0));
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 11px;
      }

      .user-name {
        font-weight: 600;
        font-size: 14px;
        color: var(--color-text-primary);
      }

      .dot-separator {
        color: var(--color-text-tertiary);
        font-size: 10px;
      }

      .comment-date {
        font-size: 12px;
        color: var(--color-text-tertiary);
      }
    }

    .delete-btn {
      background: transparent;
      border: none;
      color: var(--color-text-tertiary);
      cursor: pointer;
      padding: 4px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.6;
      transition: all 0.2s ease;

      &:hover {
        opacity: 1;
        color: var(--color-error);
        background: rgba(var(--color-error-rgb, 255, 82, 82), 0.1);
      }
    }
  }

  .comment-body {
    font-size: 14px;
    line-height: 1.5;
    color: var(--color-text-secondary);
    padding-left: 36px;
  }

  .comment-footer {
    padding-left: 36px;
    margin-top: 4px;

    .reactions-group {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;

      .reaction-pill {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 100px;
        padding: 4px 10px;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s ease;

        .react-count {
          font-weight: 600;
          font-size: 12px;
          color: var(--color-text-secondary);
        }

        &:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.15);
        }

        &.is-reacted {
          background: rgba(var(--color-primary-rgb), 0.2);
          border-color: var(--color-primary);

          .react-count {
            color: var(--color-primary);
          }
        }
      }
    }
  }
}

.toggle-expand-btn {
  width: 100%;
  padding: 12px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 100px;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .chevron-icon {
    transition: transform 0.3s ease;

    &.is-rotated {
      transform: rotate(180deg);
    }
  }
}

.empty-comments {
  padding: 24px 0;
  text-align: center;

  .empty-msg {
    font-size: 14px;
    color: var(--color-text-tertiary);
    margin: 0;
  }
}

/* Анимация списка комментариев */
.comment-anim-move,
.comment-anim-enter-active,
.comment-anim-leave-active {
  transition: all 0.3s ease;
}

.comment-anim-enter-from,
.comment-anim-leave-to {
  opacity: 0;
  transform: translateY(15px);
}

.comment-anim-leave-active {
  position: absolute;
}
</style>
