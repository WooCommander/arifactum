import { createRouter, createWebHistory } from 'vue-router'
import { authStore } from '@/modules/auth/store/authStore'

const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import('@/modules/auth/views/LoginView.vue')
    },
    {
        path: '/',
        name: 'Home',
        component: () => import('@/views/HomeView.vue')
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/modules/profile/views/ProfileView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/add-price/:id?',
        name: 'AddPrice',
        component: () => import('@/modules/prices/views/AddPriceView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/design-system',
        name: 'DesignSystem',
        component: () => import('@/views/DesignSystemView.vue')
    },
    {
        path: '/search',
        redirect: '/catalog'
    },
    {
        path: '/product/:id',
        name: 'Product',
        component: () => import('@/modules/catalog/views/ProductView.vue')
    },
    {
        path: '/store/:id',
        name: 'Store',
        component: () => import('@/modules/catalog/views/StoreView.vue')
    },
    {
        path: '/category/:id',
        name: 'Category',
        component: () => import('@/modules/catalog/views/CategoryView.vue')
    },
    {
        path: '/shopping-list',
        name: 'ShoppingList',
        component: () => import('@/modules/shopping-list/ui/ShoppingListView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/quick-calc',
        name: 'QuickCalc',
        component: () => import('@/modules/prices/views/QuickCalcView.vue')
    },
    {
        path: '/favorites',
        name: 'Favorites',
        component: () => import('@/modules/catalog/views/FavoritesView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/activity',
        name: 'Activity',
        component: () => import('@/modules/profile/views/ActivityView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/create-product',
        name: 'CreateProduct',
        component: () => import('@/modules/catalog/views/CreateProductView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/create-store',
        name: 'CreateStore',
        component: () => import('@/modules/catalog/views/CreateStoreView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/catalog',
        name: 'Catalog',
        component: () => import('@/modules/catalog/views/CatalogListView.vue')
    },
    {
        path: '/stores',
        name: 'Stores',
        component: () => import('@/modules/prices/views/StoresListView.vue')
    },
    {
        path: '/changelog',
        name: 'Changelog',
        component: () => import('@/views/ChangelogView.vue')
    },
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        component: () => import('@/modules/profile/views/LeaderboardView.vue')
    },
    {
        path: '/games',
        name: 'GamesHub',
        component: () => import('@/modules/game').then(m => m.GamesHubView)
    },
    {
        path: '/games/price-battle',
        name: 'PriceBattle',
        component: () => import('@/modules/game').then(m => m.PriceBattleView)
    },
    {
        path: '/games/flow',
        name: 'FlowGame',
        component: () => import('@/modules/game').then(m => m.FlowGameView)
    },
    {
        path: '/games/community-flow',
        name: 'CommunityFlowGame',
        component: () => import('@/modules/game').then(m => m.CommunityGameHubView)
    },
    {
        path: '/notes',
        name: 'Notes',
        component: () => import('@/modules/notes').then(m => m.NotesView),
        meta: { requiresAuth: true }
    },
    {
        path: '/birthdays',
        name: 'Birthdays',
        component: () => import('@/modules/birthdays').then(m => m.BirthdaysView),
        meta: { requiresAuth: true }
    },
    {
        path: '/receipts',
        name: 'Receipts',
        component: () => import('@/modules/receipts/ui/ReceiptsView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/receipts/add',
        name: 'AddReceipt',
        component: () => import('@/modules/receipts/ui/AddReceiptView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/games/memory',
        name: 'MemoryGame',
        component: () => import('@/modules/game').then(m => m.MemoryGameView)
    },
    {
        path: '/games/basket',
        name: 'BasketGame',
        component: () => import('@/modules/game').then(m => m.BasketGameView)
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// Guard placeholder
// Guard placeholder
router.beforeEach(async (to, _from, next) => {
    const { isAuthenticated, isLoading } = authStore

    // Wait for auth init if needed (simple check)
    // In real app we might wait for a promise
    if (isLoading.value) {
        // console.log('Auth loading...')
    }

    const requiresAuth = to.matched.some(record => record.meta.requiresAuth)

    if (requiresAuth && !isAuthenticated.value) {
        next({ name: 'Login', query: { redirect: to.fullPath } })
    } else {
        next()
    }
})

export default router
