<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useSocialStore } from '../state/useSocialStore'
import { authStore } from '@/modules/auth/store/authStore'
import { FpSpinner, FpConfirmationModal } from '@/design-system'
import { MessageSquare, Send, ChevronDown, Trash2, CornerUpLeft } from 'lucide-vue-next'
import { useNotify } from '@/composables/useNotify'

interface Props {
  routeId: string
}

const props = defineProps<Props>()

const socialStore = useSocialStore()
const { notify } = useNotify()

const commentText = ref('')
const isSubmitting = ref(false)
const visibleLimit = ref(3)
const pendingDeleteId = ref<string | null>(null)
const commentInputRef = ref<HTMLInputElement | null>(null)

const currentUserId = computed(() => authStore.currentUserId.value)
const currentUser = computed(() => authStore.user.value)
const comments = computed(() => socialStore.comments.value)
const currentUserName = computed(() => {
  const myComment = comments.value.find(c => Boolean(currentUserId.value) && c.userId === currentUserId.value)
  if (myComment && myComment.userName) return myComment.userName

  if (!currentUser.value) return 'Аноним'
  return currentUser.value.user_metadata?.full_name || currentUser.value.user_metadata?.name || currentUser.value.email?.split('@')[0] || 'Аноним'
})
const isLoading = computed(() => socialStore.isLoading.value)

const visibleComments = computed(() => {
  return comments.value.slice(0, visibleLimit.value)
})

const hasMoreComments = computed(() => {
  return comments.value.length > visibleLimit.value
})

function showMore(): void {
  visibleLimit.value += 5
}

function collapseAll(): void {
  visibleLimit.value = 3
}

async function loadComments(): Promise<void> {
  if (!props.routeId) return
  await socialStore.fetchComments(props.routeId)
  visibleLimit.value = 3
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

async function confirmDelete(): Promise<void> {
  if (!pendingDeleteId.value) return
  try {
    await socialStore.deleteComment(pendingDeleteId.value)
    notify('Комментарий удален', 'success')
  } catch (err) {
    notify('Ошибка при удалении комментария', 'error')
  } finally {
    pendingDeleteId.value = null
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

function isMentioned(content: string): boolean {
  if (!content || !currentUserName.value) return false
  const mention = `@${currentUserName.value}`
  return content.toLowerCase().includes(mention.toLowerCase())
}

function onReply(userName: string): void {
  if (!userName) return
  const prefix = `@${userName}, `
  if (!commentText.value.startsWith(prefix)) {
    commentText.value = prefix + commentText.value
  }
  setTimeout(() => {
    commentInputRef.value?.focus()
  }, 50)
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatCommentContent(text: string): string {
  if (!text) return ''
  const escaped = escapeHtml(text)
  const urlRegex = /(https?:\/\/[^\s]+)/g
  let linked = escaped.replace(urlRegex, url => {
    return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="comment-link">${url}</a>`
  })

  if (currentUserName.value) {
    const mentionRegex = new RegExp(`(@${currentUserName.value})\\b`, 'gi')
    linked = linked.replace(mentionRegex, match => `<span class="mention-badge">${match}</span>`)
  }

  return linked.replace(/\n/g, '<br>')
}
</script>

<template>
  <div class="route-comments">
    <div class="header-row">
      <div class="title-group">
        <MessageSquare :size="18" class="title-icon" />
        <h3 class="title">Комментарии <span class="count" v-if="comments.length">({{ comments.length }})</span></h3>
      </div>
      <div v-if="isLoading" class="spinner-wrap">
        <FpSpinner size="sm" />
      </div>
    </div>

    <!-- Поле ввода комментария -->
    <div class="input-box">
      <input ref="commentInputRef" v-model="commentText" type="text" class="comment-input"
        placeholder="Написать комментарий..." @keyup.enter="onSubmit" />
      <button class="send-btn" :class="{ 'is-active': commentText.trim().length > 0 }"
        :disabled="!commentText.trim() || isSubmitting" @click="onSubmit" title="Отправить">
        <FpSpinner v-if="isSubmitting" size="sm" />
        <Send v-else :size="15" />
      </button>
    </div>

    <!-- Список комментариев -->
    <div class="comments-list" v-if="comments.length > 0">
      <transition-group name="comment-anim">
        <div v-for="comment in visibleComments" :key="comment.id" class="comment-item"
          :class="{ 'is-mentioned': isMentioned(comment.content) }">
          <div class="comment-header">
            <div class="user-meta">
              <div class="avatar-circle"
                :style="comment.avatarUrl ? `background-image: url(${comment.avatarUrl})` : ''">
                {{ !comment.avatarUrl ? (comment.userName?.[0]?.toUpperCase() || '?') : '' }}
              </div>
              <span class="user-name" @click="onReply(comment.userName)" title="Ответить">{{ comment.userName }}</span>
              <span class="dot-separator">•</span>
              <span class="comment-date">{{ formatDate(comment.createdAt) }}</span>
            </div>

            <div class="actions-group">
              <button class="action-btn reply-btn" @click="onReply(comment.userName)" title="Ответить">
                <CornerUpLeft :size="13" />
              </button>

              <button v-if="currentUserId === comment.userId" class="action-btn delete-btn"
                @click="pendingDeleteId = comment.id" title="Удалить комментарий">
                <Trash2 :size="13" />
              </button>
            </div>
          </div>

          <div class="comment-body" v-html="formatCommentContent(comment.content)"></div>

          <div class="comment-footer">
            <div class="reactions-group">
              <button v-for="emoji in ['👍', '❤️', '🔥']" :key="emoji" class="reaction-pill"
                :class="{ 'is-reacted': comment.userReaction === emoji }" @click="toggleReaction(comment.id, emoji)">
                <span class="emoji">{{ emoji }}</span>
                <span v-if="comment.reactions && comment.reactions[emoji] > 0" class="react-count">
                  {{ comment.reactions[emoji] }}
                </span>
              </button>
            </div>
          </div>
        </div>
      </transition-group>

      <!-- Управление пагинацией / подгрузкой -->
      <div v-if="comments.length > 3" class="pagination-actions">
        <button v-if="hasMoreComments" class="toggle-expand-btn" @click="showMore">
          <span>Показать еще 5 (осталось {{ comments.length - visibleLimit }})</span>
          <ChevronDown :size="16" class="chevron-icon" />
        </button>
        <button v-else class="toggle-expand-btn is-collapsed" @click="collapseAll">
          <span>Свернуть список</span>
          <ChevronDown :size="16" class="chevron-icon is-rotated" />
        </button>
      </div>
    </div>

    <!-- Состояние когда комментариев нет -->
    <div class="empty-comments" v-else-if="!isLoading">
      <p class="empty-msg">Пока нет комментариев. Станьте первым, кто поделится впечатлением!</p>
    </div>
  </div>

  <FpConfirmationModal
    :visible="!!pendingDeleteId"
    title="Удалить комментарий?"
    message="Это действие нельзя отменить"
    confirmText="Удалить"
    variant="danger"
    @confirm="confirmDelete"
    @update:visible="if (!$event) pendingDeleteId = null"
  />
</template>

<style scoped lang="scss">
.route-comments {
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;

    .title-icon {
      color: var(--color-primary);
    }

    .title {
      font-size: 15px;
      font-weight: 700;
      color: var(--color-text-primary);
      margin: 0;

      .count {
        font-weight: 500;
        color: var(--color-text-tertiary);
        font-size: 13px;
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
  gap: 8px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 100px;
  padding: 4px 8px 4px 14px;
  transition: all 0.2s ease;

  &:focus-within {
    background: rgba(255, 255, 255, 0.06);
    border-color: var(--color-primary);
  }

  .comment-input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    font-size: 13.5px;
    color: var(--color-text-primary);

    &::placeholder {
      color: var(--color-text-tertiary);
    }
  }

  .send-btn {
    width: 28px;
    height: 28px;
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
  gap: 4px;
}

.comment-item {
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  border-radius: 0;
  padding: 8px 4px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  transition: all 0.2s ease;

  &.is-mentioned {
    background: linear-gradient(90deg, rgba(var(--color-primary-rgb, 187, 134, 252), 0.12), transparent);
    border-left: 3px solid var(--color-primary);
    border-radius: 0 8px 8px 0;
    padding-left: 8px;
  }

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: rgba(255, 255, 255, 0.015);
    border-radius: 8px;
  }

  .comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;

    .user-meta {
      display: flex;
      align-items: center;
      gap: 8px;

      .avatar-circle {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--color-primary), var(--color-secondary, #9c27b0));
        background-size: cover;
        background-position: center;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: 9px;
      }

      .user-name {
        font-weight: 600;
        font-size: 13px;
        color: var(--color-text-primary);
        cursor: pointer;
        transition: color 0.2s ease;

        &:hover {
          color: var(--color-primary);
        }
      }

      .dot-separator {
        color: var(--color-text-tertiary);
        font-size: 10px;
      }

      .comment-date {
        font-size: 11px;
        color: var(--color-text-tertiary);
      }
    }

    .actions-group {
      display: flex;
      align-items: center;
      gap: 4px;

      .action-btn {
        background: transparent;
        border: none;
        color: var(--color-text-tertiary);
        cursor: pointer;
        padding: 2px 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.5;
        transition: all 0.2s ease;

        &:hover {
          opacity: 1;
        }

        &.reply-btn:hover {
          color: var(--color-primary);
          background: rgba(var(--color-primary-rgb, 187, 134, 252), 0.1);
        }

        &.delete-btn:hover {
          color: var(--color-error);
          background: rgba(var(--color-error-rgb, 255, 82, 82), 0.1);
        }
      }
    }
  }

  .comment-body {
    font-size: 13px;
    line-height: 1.35;
    color: var(--color-text-secondary);
    padding-left: 28px;
    margin-top: -2px;
    word-break: break-word;

    :deep(.comment-link) {
      color: var(--color-primary);
      text-decoration: none;
      font-weight: 500;
      border-bottom: 1px dashed rgba(var(--color-primary-rgb, 187, 134, 252), 0.5);
      transition: all 0.2s ease;

      &:hover {
        color: var(--color-primary-light, #d1a5ff);
        border-bottom-style: solid;
      }
    }

    :deep(.mention-badge) {
      color: var(--color-primary);
      background: rgba(var(--color-primary-rgb, 187, 134, 252), 0.25);
      padding: 0 4px;
      border-radius: 4px;
      font-weight: 600;
    }
  }

  .comment-footer {
    padding-left: 28px;
    margin-top: 2px;

    .reactions-group {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;

      .reaction-pill {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 100px;
        padding: 1px 6px;
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11.5px;
        cursor: pointer;
        transition: all 0.2s ease;

        .react-count {
          font-weight: 600;
          font-size: 10.5px;
          color: var(--color-text-secondary);
        }

        &:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.12);
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

.pagination-actions {
  margin-top: 4px;
}

.toggle-expand-btn {
  width: 100%;
  padding: 8px 0;
  background: transparent;
  border: none;
  color: var(--color-primary);
  font-weight: 600;
  font-size: 12.5px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 6px;
  cursor: pointer;
  opacity: 0.9;
  transition: all 0.2s ease;

  &:hover {
    opacity: 1;
    color: var(--color-primary-light, #d1a5ff);
  }

  .chevron-icon {
    transition: transform 0.3s ease;

    &.is-rotated {
      transform: rotate(180deg);
    }
  }
}

.empty-comments {
  padding: 16px 0;
  text-align: center;

  .empty-msg {
    font-size: 13px;
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
  transform: translateY(10px);
}

.comment-anim-leave-active {
  position: absolute;
}
</style>
