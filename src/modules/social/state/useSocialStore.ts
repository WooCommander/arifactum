import { ref, readonly } from 'vue'
import { socialService } from '../services/socialService'
import { socialAdapter, type UserComment } from '../adapters/socialAdapter'

const comments = ref<UserComment[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useSocialStore = () => {
    const fetchComments = async (routeId: string) => {
        isLoading.value = true
        error.value = null
        try {
            const dtos = await socialService.getComments(routeId)
            comments.value = dtos.map(socialAdapter.toCommentUI)
        } catch (err: any) {
            console.error('Failed to fetch comments:', err)
            error.value = err.message || 'Ошибка загрузки комментариев'
        } finally {
            isLoading.value = false
        }
    }

    const addComment = async (routeId: string, userId: string, content: string) => {
        try {
            const dto = await socialService.addComment(routeId, userId, content)
            const newComment = socialAdapter.toCommentUI(dto)
            comments.value = [newComment, ...comments.value]
        } catch (err: any) {
            console.error('Failed to add comment:', err)
            throw err
        }
    }

    const deleteComment = async (id: string) => {
        try {
            await socialService.deleteComment(id)
            comments.value = comments.value.filter(c => c.id !== id)
        } catch (err: any) {
            console.error('Failed to delete comment:', err)
            throw err
        }
    }

    const toggleLike = async (routeId: string, userId: string) => {
        return await socialService.toggleLike(routeId, userId)
    }

    const toggleFavorite = async (routeId: string, userId: string) => {
        return await socialService.toggleFavorite(routeId, userId)
    }

    const getRouteSocialStatus = async (routeId: string, userId: string) => {
        return await socialService.getRouteSocialStatus(routeId, userId)
    }

    return {
        comments: readonly(comments),
        isLoading: readonly(isLoading),
        error: readonly(error),
        fetchComments,
        addComment,
        deleteComment,
        toggleLike,
        toggleFavorite,
        getRouteSocialStatus
    }
}
