import { createApp } from 'vue'
import './styles/main.scss'
import App from './App.vue'
import router from './router'
import { i18n } from './i18n'


import { authStore } from '@/modules/auth/store/authStore'

const app = createApp(App)

authStore.init().then(() => {
    app.use(router)
    app.use(i18n)
    app.mount('#app')
})
