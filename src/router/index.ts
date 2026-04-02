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
        path: '/routes',
        name: 'Routes',
        component: () => import('@/modules/routes').then(m => m.RoutesView)
    },
    {
        path: '/route/:id',
        name: 'RouteDetail',
        component: () => import('@/modules/routes').then(m => m.RouteDetailView)
    },
    {
        path: '/create-route',
        name: 'CreateRoute',
        component: () => import('@/modules/routes').then(m => m.CreateRouteView),
        meta: { requiresAuth: true }
    },
    {
        path: '/teams',
        name: 'Teams',
        component: () => import('@/modules/teams').then(m => m.TeamsView),
        meta: { requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/modules/profile/views/ProfileView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/activity',
        name: 'Activity',
        component: () => import('@/modules/profile/views/ActivityView.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/leaderboard',
        name: 'Leaderboard',
        component: () => import('@/modules/profile/views/LeaderboardView.vue')
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
