import { ref, computed, readonly } from 'vue'
import { categoryService, type Category } from '../services/categoryService'

const categories = ref<Category[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

export const useCategoryStore = () => {
    const categoryNames = computed(() => categories.value.map(c => c.name))

    async function init() {
        if (categories.value.length > 0) return
        await fetchCategories()
    }

    async function fetchCategories() {
        isLoading.value = true
        error.value = null
        try {
            categories.value = await categoryService.getCategories()
        } catch (err: any) {
            error.value = err.message
        } finally {
            isLoading.value = false
        }
    }

    async function addCategory(name: string) {
        // Prevent duplicates
        if (categoryNames.value.includes(name)) return
        
        try {
            const newCat = await categoryService.addCategory(name)
            categories.value.push(newCat)
            return newCat
        } catch (err: any) {
            console.error('Failed to add category:', err)
            // Fallback for demo/offline if needed
            const fallback: Category = { id: Date.now().toString(), name }
            categories.value.push(fallback)
            return fallback
        }
    }

    return {
        categories: readonly(categories),
        categoryNames,
        isLoading: readonly(isLoading),
        error: readonly(error),
        init,
        fetchCategories,
        addCategory
    }
}
