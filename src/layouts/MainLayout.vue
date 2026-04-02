<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { computed, ref, onMounted, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { authStore } from '@/modules/auth/store/authStore'
import { CatalogService } from '@/modules/catalog/services/CatalogService'
import { changelog } from '@/data/changelog'
import { setLocale, supportedLocales, i18n } from '@/i18n'
import { useI18n } from 'vue-i18n'
import { Home, Star, User, Package, Store, Trophy, Menu, X, CheckSquare, Calculator, Palette, FileText, LogOut, Sun, Moon, Plus, ShoppingCart, Gamepad2, StickyNote, Gift, Receipt } from 'lucide-vue-next'
import { FpHaptics } from '@/shared/lib/haptics'
const refreshKey = ref(0)
const forceRefresh = () => { refreshKey.value += 1 }

const router = useRouter()
const route = useRoute()
const { isDark, toggleTheme } = useTheme()
const { t } = useI18n()
const userRef = computed(() => authStore.user.value)
const appVersion = changelog[0]?.version || ''
const currentLocale = computed(() => i18n.global.locale.value as string)
const locales = supportedLocales.map(code => ({
	code,
	label: code.toUpperCase()
}))
const avatarUrl = computed(() => {
	const meta = userRef.value?.user_metadata as Record<string, any> | undefined
	return meta?.avatar_url || meta?.picture || null
})
const avatarLetter = computed(() => userRef.value?.email?.charAt(0).toUpperCase() || '?')
const profileTooltip = computed(() => userRef.value?.email || t('auth.guest'))
const pendingModerationCount = ref(0)
const loadPendingCount = async () => {
	if (!userRef.value) return
	try {
		const items = await CatalogService.getPendingProductsForModeration()
		pendingModerationCount.value = items.length
	} catch { pendingModerationCount.value = 0 }
}
onMounted(loadPendingCount)
watch(userRef, loadPendingCount)

const handleProfileClick = async () => {
	FpHaptics.light()
	if (userRef.value) {
		router.push('/profile')
		return
	}
	// try to rehydrate session before sending to login
	if (authStore.isLoading.value) return
	await authStore.init()
	if (userRef.value) {
		router.push('/profile')
	} else {
		router.push('/login')
	}
}

const navItems = computed(() => [
	{
		label: t('nav.home'),
		path: '/',
		icon: Home
	},
	{
		label: t('nav.favorites'),
		path: '/favorites',
		icon: Star
	},
	{
		label: t('nav.profile'),
		path: '/profile',
		icon: User
	},
	{
		label: t('nav.catalog'),
		path: '/catalog',
		icon: Package
	},
	{
		label: t('nav.stores'),
		path: '/stores',
		icon: Store
	},
	{
		label: t('nav.leaderboard'),
		path: '/leaderboard',
		icon: Trophy
	}
])

const currentPath = computed(() => route.path)

const navigate = (path: string) => {
	FpHaptics.light()
	if (route.path === path && Object.keys(route.query).length === 0) {
		forceRefresh() // Reset the view if already there
	} else {
		router.push(path)
	}
}

// const { currentCurrency } = catalogStore
// const currencies: Array<'RUB' | 'USD' | 'EUR'> = ['RUB', 'USD', 'EUR']

const isMenuOpen = ref(false)

const handleLogout = async () => {
	isMenuOpen.value = false
	await authStore.logout()
	router.push('/login')
}




</script>

<template>
	<div class="main-layout">
		<header class="top-nav">
			<div class="nav-container">
				<div class="logo-area">
					<button class="hamburger-btn" @click="isMenuOpen = true" v-if="!isMenuOpen">
						<Menu :size="24" />
					</button>

					<div class="logo" @click="router.push('/')">
						Fair Price
						<span v-if="appVersion" class="version-pill">v{{ appVersion }}</span>
					</div>
				</div>

				<div class="actions">
					<div class="locale-selector">
						<button v-for="loc in locales" :key="loc.code" class="loc-btn"
							:class="{ active: currentLocale === loc.code }" @click="setLocale(loc.code as any)">
							{{ loc.label }}
						</button>
					</div>
					<!-- <button v-if="!user.value" class="login-btn" @click="router.push('/login')">
						<span class="btn-text">Войти</span>
					</button> -->
					<div class="profile-chip" :class="{ guest: !userRef }" :title="profileTooltip" @click="handleProfileClick">
						<img v-if="avatarUrl" :src="avatarUrl" alt="avatar" referrerpolicy="no-referrer" />
						<span v-else class="avatar-letter">{{ avatarLetter }}</span>
						<span v-if="pendingModerationCount > 0" class="moderation-badge">{{ pendingModerationCount > 99 ? '99+' : pendingModerationCount }}</span>
					</div>
				</div>
			</div>

		</header>

		<main class="page-content">
			<div class="content-container">
				<router-view v-slot="{ Component }">
					<transition name="fade" mode="out-in">
						<component :is="Component" :key="route.fullPath + '-' + refreshKey" />
					</transition>
				</router-view>
			</div>
		</main>

		<!-- Bottom Navigation (Mobile) -->
		<nav class="bottom-nav">
			<a class="nav-item" :class="{ active: route.path === '/' }" @click.prevent="navigate('/')">
				<Home class="icon" :size="20" />
				<span class="label">{{ t('nav.home') }}</span>
			</a>
			<a class="nav-item" :class="{ active: route.path === '/catalog' }" @click.prevent="navigate('/catalog')">
				<Package class="icon" :size="20" />
				<span class="label">{{ t('nav.catalog') }}</span>
			</a>
			<div class="nav-item action" @click="navigate('/add-price')">
				<div class="plus-btn" :class="{ active: route.path === '/add-price' }">
					<Plus :size="24" :stroke-width="3" />
				</div>
				<span class="label">{{ t('nav.addPrice') }}</span>
			</div>
			<a class="nav-item" :class="{ active: route.path === '/shopping-list' }"
				@click.prevent="navigate('/shopping-list')">
				<ShoppingCart class="icon" :size="20" />
				<span class="label">{{ t('nav.shoppingList') }}</span>
			</a>
			<a class="nav-item" :class="{ active: route.path === '/quick-calc' }" @click.prevent="navigate('/quick-calc')">
				<Calculator class="icon" :size="20" />
				<span class="label">{{ t('nav.quickCalc') }}</span>
			</a>
		</nav>

		<!-- Backdrop -->
		<transition name="fade">
			<div v-if="isMenuOpen" class="menu-backdrop" @click="isMenuOpen = false"></div>
		</transition>

		<!-- Side Drawer -->
		<transition name="slide-right">
			<div v-if="isMenuOpen" class="menu-drawer">
				<div class="drawer-header">
					<div class="drawer-user" v-if="authStore.user.value">
						<div class="drawer-avatar">
							{{ authStore.user.value.email?.charAt(0).toUpperCase() }}
						</div>
						<div class="drawer-user-info">
							<span class="drawer-email">{{ authStore.user.value.email }}</span>
							<span class="drawer-status">Online</span>
						</div>
					</div>
					<div class="drawer-user guest" v-else>
						<div class="drawer-avatar guest-avatar">
							?
						</div>
						<div class="drawer-user-info">
							<span class="drawer-email">{{ t('auth.guest') }}</span>
							<button class="link-btn" @click="router.push('/login'); isMenuOpen = false">{{ t('auth.login') }}</button>
						</div>
					</div>

					<button class="close-btn" @click="isMenuOpen = false">
						<X :size="24" />
					</button>
				</div>

				<div class="drawer-content">
					<div class="nav-group">
						<span class="nav-label">{{ t('nav.menu') }}</span>
						<a v-for="item in navItems" :key="item.path" class="drawer-link"
							:class="{ active: currentPath === item.path }" @click.prevent="navigate(item.path); isMenuOpen = false">
							<span class="link-icon"><component :is="item.icon" :size="24" /></span>
							{{ item.label }}
						</a>
					</div>

					<div class="nav-group">
						<span class="nav-label">{{ t('nav.tools') }}</span>
						<a class="drawer-link" :class="{ active: currentPath === '/shopping-list' }"
							@click.prevent="navigate('/shopping-list'); isMenuOpen = false">
							<span class="link-icon">
								<CheckSquare :size="24" />
							</span>
							{{ t('nav.shoppingList') }}
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/quick-calc' }"
							@click.prevent="navigate('/quick-calc'); isMenuOpen = false">
							<span class="link-icon">
								<Calculator :size="24" />
							</span>
							{{ t('nav.quickCalc') }}
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/notes' }"
							@click.prevent="navigate('/notes'); isMenuOpen = false">
							<span class="link-icon">
								<StickyNote :size="24" />
							</span>
							Заметки
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/birthdays' }"
							@click.prevent="navigate('/birthdays'); isMenuOpen = false">
							<span class="link-icon">
								<Gift :size="24" />
							</span>
							Дни Рождения
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/receipts' }"
							@click.prevent="navigate('/receipts'); isMenuOpen = false">
							<span class="link-icon">
								<Receipt :size="24" />
							</span>
							Мои Чеки
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/favorites' }"
							@click.prevent="navigate('/favorites'); isMenuOpen = false">
							<span class="link-icon">
								<Star :size="24" />
							</span>
							{{ t('nav.favorites') }}
						</a>
					</div>

					<div class="nav-group">
						<span class="nav-label">{{ t('nav.dev') }}</span>
						<a class="drawer-link" :class="{ active: currentPath === '/design-system' }"
							@click.prevent="navigate('/design-system'); isMenuOpen = false">
							<span class="link-icon">
								<Palette :size="24" />
							</span>
							{{ t('nav.designSystem') }}
						</a>
						<a class="drawer-link" :class="{ active: currentPath === '/changelog' }"
							@click.prevent="navigate('/changelog'); isMenuOpen = false">
							<span class="link-icon">
								<FileText :size="24" />
							</span>
							{{ t('nav.changelog') }}
						</a>
					</div>

					<div class="nav-group">
						<span class="nav-label">Развлечения</span>
						<a class="drawer-link" :class="{ active: currentPath.startsWith('/games') }"
							@click.prevent="navigate('/games'); isMenuOpen = false">
							<span class="link-icon">
								<Gamepad2 :size="24" />
							</span>
							Игры
						</a>
					</div>
				</div>

				<div class="drawer-footer">
					<button class="theme-toggle-drawer" @click="toggleTheme">
						<span class="icon">
							<Sun v-if="isDark" :size="20" />
							<Moon v-else :size="20" />
						</span>
						<span>{{ isDark ? t('theme.light') : t('theme.dark') }}</span>
					</button>

					<button v-if="authStore.user.value" class="logout-drawer" @click="handleLogout">
						<LogOut :size="20" class="mr-2" />
						{{ t('auth.logout') }}
					</button>
				</div>
			</div>
		</transition>
	</div>
</template>

<style scoped lang="scss">
.main-layout {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
	background-color: var(--color-background);
}

.top-nav {
	background-color: var(--color-surface-translucent); // Keep translucent
	backdrop-filter: blur(12px);
	border-bottom: 1px solid var(--color-border);
	position: sticky;
	top: 0;
	z-index: 1000; // Increased to be above page content sticky elements
	padding: 0 var(--spacing-lg);
	padding-top: env(safe-area-inset-top, 0px);

	@media (max-width: 768px) {
		padding-left: 8px;
		padding-right: 8px;
	}

	.nav-container {
		max-width: var(--layout-max-width);

		height: 64px; // Standard height
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.logo {
		font-size: 20px;
		font-weight: 700;
		color: var(--color-text-primary);
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 8px;

		.version-pill {
			font-size: 11px;
			font-weight: 700;
			color: var(--color-text-tertiary);
			background: var(--color-surface);
			border: 1px solid var(--color-border);
			border-radius: 999px;
			padding: 2px 8px;
			line-height: 1.2;
		}
	}
}

.logo-area {
	display: flex;
	align-items: center;
	gap: 12px;
}

.actions {
	display: flex;
	align-items: center;
	gap: 12px;
}

.locale-selector {
	display: flex;
	background: var(--color-surface);
	padding: 3px;
	border-radius: 10px;
	border: 1px solid var(--color-border);
	gap: 4px;

	.loc-btn {
		background: none;
		border: none;
		padding: 4px 8px;
		font-size: 10px;
		font-weight: 700;
		color: var(--color-text-tertiary);
		border-radius: 7px;
		cursor: pointer;
		transition: all 0.2s;

		&.active {
			background: var(--color-primary);
			color: white;
		}
	}
}

.currency-selector {
	display: flex;
	background: var(--color-surface);
	padding: 3px;
	border-radius: 10px;
	border: 1px solid var(--color-border);
	gap: 2px;

	.curr-btn {
		background: none;
		border: none;
		padding: 3px 7px;
		font-size: 10px;
		font-weight: 700;
		color: var(--color-text-tertiary);
		border-radius: 7px;
		cursor: pointer;
		transition: all 0.2s;

		&.active {
			background: var(--color-primary);
			color: white;
		}
	}
}

.profile-chip {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--color-primary);
	color: var(--color-on-primary);
	font-weight: 700;
	font-size: 15px;
	cursor: pointer;
	transition: transform 0.15s ease, box-shadow 0.2s ease, background 0.2s;
	box-shadow: 0 6px 14px color-mix(in srgb, var(--color-primary) 24%, transparent);

	position: relative;

	img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		border-radius: 50%;
	}

	.moderation-badge {
		position: absolute;
		top: -4px;
		right: -4px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		border-radius: 8px;
		background: var(--color-error);
		color: var(--color-on-primary);
		font-size: 10px;
		font-weight: 700;
		line-height: 16px;
		text-align: center;
		border: 2px solid var(--color-background);
		pointer-events: none;
	}

	&:hover {
		transform: translateY(-1px);
		box-shadow: 0 8px 18px color-mix(in srgb, var(--color-primary) 28%, transparent);
	}

	&:active {
		transform: scale(0.96);
	}

	&.guest {
		background: var(--color-text-tertiary);
		box-shadow: none;
	}
}

.hamburger-btn,
.back-btn {
	background: none;
	border: none;
	font-size: 24px;
	cursor: pointer;
	color: var(--color-text-primary);
	padding: 4px;
	z-index: 1002;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-sm);
	transition: background 0.2s;

	&:hover {
		background: var(--color-surface-hover);
	}
}

.menu-backdrop {
	position: fixed;
	top: 0;
	left: 0;
	width: 100vw;
	height: 100vh;
	background: color-mix(in srgb, var(--color-text-primary) 60%, transparent);
	z-index: 2000;
	backdrop-filter: blur(4px);
}

.menu-drawer {
	position: fixed;
	top: 0;
	left: 0;
	width: 85%;
	max-width: 320px;
	height: 100vh;
	height: 100dvh; // Dynamic viewport height for mobile browsers
	background: var(--color-surface);
	z-index: 2005;
	display: flex;
	flex-direction: column;
	box-shadow: var(--shadow-3);
	border-right: 1px solid var(--color-border);
}

.drawer-header {
	padding: 24px 20px;
	border-bottom: 1px solid var(--color-border);
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
}

.drawer-user {
	display: flex;
	align-items: center;
	gap: 16px;
	min-width: 0;
	flex: 1;
}

.drawer-avatar {
	width: 48px;
	height: 48px;
	border-radius: 50%;
	background: var(--color-primary);
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 1.25rem;
	font-weight: 700;
}

.guest-avatar {
	background: var(--color-text-tertiary);
}

.drawer-user-info {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.drawer-email {
	font-weight: 600;
	color: var(--color-text-primary);
	font-size: 0.95rem;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.drawer-status {
	font-size: 0.8rem;
	color: var(--color-success);
}

.link-btn {
	background: none;
	border: none;
	padding: 0;
	color: var(--color-primary);
	font-weight: 600;
	cursor: pointer;
	text-align: left;
}

.close-btn {
	background: none;
	border: none;
	color: var(--color-text-secondary);
	cursor: pointer;
	padding: 4px;

	&:hover {
		color: var(--color-text-primary);
	}
}

.drawer-content {
	flex: 1;
	overflow-y: auto;
	padding: 24px 0;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.nav-group {
	display: flex;
	flex-direction: column;
}

.nav-label {
	padding: 0 24px 8px;
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.1em;
	color: var(--color-text-tertiary);
	font-weight: 700;
}

.drawer-link {
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 24px;
	color: var(--color-text-secondary);
	text-decoration: none;
	font-weight: 500;
	transition: all 0.2s;
	border-left: 3px solid transparent;

	.link-icon {
		display: flex;
		align-items: center;
		color: var(--color-text-tertiary);
		transition: color 0.2s;
	}

	&:hover,
	&.active {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);

		.link-icon {
			color: var(--color-primary);
		}
	}

	&.active {
		border-left-color: var(--color-primary);
		background: color-mix(in srgb, var(--color-primary) 5%, transparent);
	}
}

.drawer-footer {
	padding: 20px;
	padding-bottom: calc(20px + env(safe-area-inset-bottom, 16px));
	border-top: 1px solid var(--color-border);
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.theme-toggle-drawer,
.logout-drawer {
	display: flex;
	align-items: center;
	gap: 12px;
	width: 100%;
	padding: 12px;
	background: none;
	border: none;
	border-radius: var(--radius-md);
	cursor: pointer;
	font-weight: 500;
	color: var(--color-text-secondary);
	transition: background 0.2s;

	&:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
	}
}

.logout-drawer:hover {
	color: var(--color-error);
	background: color-mix(in srgb, var(--color-error) 5%, transparent);
}

// Right slide transition
.slide-right-enter-active,
.slide-right-leave-active {
	transition: transform 0.3s ease;
}

.slide-right-enter-from,
.slide-right-leave-to {
	transform: translateX(-100%);
}

.fade-enter-active,
.fade-leave-active {
	transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
	opacity: 0;
}

.page-content {
	flex: 1;
	overflow-y: auto;
	display: flex;
	flex-direction: column;
}

.content-container {
	max-width: 100%;

	padding: var(--spacing-lg);
	flex: 1;
	display: flex;
	flex-direction: column;
	width: 100%;

	@media (max-width: 768px) {
		padding: 0;
		padding-bottom: 72px; // Space for bottom nav
	}
}

.bottom-nav {
	display: none;

	@media (max-width: 768px) {
		display: flex;
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 64px;
		height: calc(64px + env(safe-area-inset-bottom, 0px));
		background: var(--color-surface-translucent);
		backdrop-filter: blur(12px);
		border-top: 1px solid var(--color-border);
		z-index: 1000;
		padding-bottom: env(safe-area-inset-bottom, 0px);
		justify-content: space-around;
		align-items: center;
	}

	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--color-text-tertiary);
		text-decoration: none;
		flex: 1;
		gap: 4px;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;

		.icon {
			font-size: 20px;
		}

		.label {
			font-size: 10px;
			font-weight: 500;
			letter-spacing: 0.02em;
		}

		&.active {
			color: var(--color-on-primary);

			&::before {
				content: '';
				position: absolute;
				width: 44px;
				height: 44px;
				top: -6px;
				left: 50%;
				transform: translateX(-50%);
				background: linear-gradient(150deg, var(--color-primary), var(--color-primary-variant));
				border-radius: 18px;
				z-index: -1;
				box-shadow: 0 10px 22px color-mix(in srgb, var(--color-primary) 35%, transparent);
				pointer-events: none;
			}

			.icon {
				transform: translateY(-2px);
				filter: drop-shadow(0 2px 6px color-mix(in srgb, var(--color-text-primary) 40%, transparent));
			}

			.label {
				font-weight: 800;
				letter-spacing: 0.05em;
				color: var(--color-on-primary);
			}
		}

		&.action {
			position: relative;
			top: -12px;

			.plus-btn {
				width: 48px;
				height: 48px;
				background: var(--color-primary);
				color: var(--color-on-primary);
				border-radius: 50%;
				display: flex;
				align-items: center;
				justify-content: center;
				box-shadow: 0 4px 12px color-mix(in srgb, var(--color-primary) 30%, transparent);
				margin-bottom: 2px;
				transition: all 0.2s;

				&.active {
					box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-primary) 20%, transparent);
				}
			}

			&:active .plus-btn {
				transform: scale(0.9);
			}
		}
	}
}
</style>
