<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { authStore } from '../store/authStore'
import FpInput from '@/design-system/components/FpInput.vue'
import FpButton from '@/design-system/components/FpButton.vue'
import FpCard from '@/design-system/components/FpCard.vue'
import { useI18n } from 'vue-i18n'

const router = useRouter()
const { t } = useI18n()

const isLogin = ref(true)
const email = ref('')
const password = ref('')
const error = ref('')
const successMessage = ref('')

const toggleMode = () => {
    isLogin.value = !isLogin.value
    error.value = ''
    successMessage.value = ''
}

const handleSubmit = async () => {
    error.value = ''
    successMessage.value = ''

    // Basic validation
    if (!email.value || !password.value) {
        error.value = t('login.errors.fillAll')
        return
    }

    if (password.value.length < 6) {
        error.value = t('login.errors.shortPassword')
        return
    }

    if (isLogin.value) {
        const success = await authStore.login(email.value, password.value)
        if (success) {
            const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
            router.push(redirectPath)
        } else {
            const errorMessage = authStore.error.value || t('login.errors.loginFailed')
            if (errorMessage.toLowerCase().includes('email not confirmed')) {
                error.value = t('login.errors.notConfirmed')
            } else if (errorMessage.toLowerCase().includes('invalid login credentials')) {
                error.value = t('login.errors.invalidCredentials')
            } else {
                error.value = errorMessage
            }
        }
    } else {
        const result: any = await authStore.register(email.value, password.value)
        if (result.success) {
            if (result.message) {
                // Email confirmation needed
                successMessage.value = t('login.successRegister')
                isLogin.value = true
                password.value = '' // Clear password for security
            } else {
                const redirectPath = (router.currentRoute.value.query.redirect as string) || '/'
                router.push(redirectPath)
            }
        } else {
            error.value = result.error || t('login.errors.registerFailed')
        }
    }
}
</script>

<template>
    <div class="auth-view">
        <FpCard class="auth-card">
            <h1 class="title">{{ isLogin ? t('login.title') : t('login.registerTitle') }}</h1>

            <div class="form">
                <div class="error-alert" v-if="error">{{ error }}</div>
                <div class="success-alert" v-if="successMessage">{{ successMessage }}</div>

                <FpInput v-model="email" :label="t('login.email')" type="email" placeholder="name@example.com" />

                <FpInput v-model="password" :label="t('login.password')" type="password" placeholder="••••••"
                    @keyup.enter="handleSubmit" />

                <div class="actions">
                    <FpButton :loading="authStore.isLoading.value" size="full" @click="handleSubmit">
                        {{ isLogin ? t('login.submitLogin') : t('login.submitRegister') }}
                    </FpButton>
                </div>

                <div class="toggle-mode">
                    <span v-if="isLogin">
                        {{ t('login.noAccount') }} <a href="#" @click.prevent="toggleMode">{{ t('login.create') }}</a>
                    </span>
                    <span v-else>
                        {{ t('login.haveAccount') }} <a href="#" @click.prevent="toggleMode">{{ t('login.enter') }}</a>
                    </span>
                </div>
            </div>
        </FpCard>
    </div>
</template>

<style scoped lang="scss">
.auth-view {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 80vh;
    /* Centered vertically in layout */
    padding: var(--spacing-md);
    background: radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--color-primary) 8%, transparent), transparent 32%),
        radial-gradient(circle at 80% 10%, color-mix(in srgb, var(--color-secondary) 6%, transparent), transparent 28%),
        var(--color-background);
}

.auth-card {
    width: 100%;
    max-width: 400px;
    padding: 28px 24px 32px;
}

.title {
    text-align: center;
    margin-bottom: var(--spacing-lg);
    font-size: var(--text-h3);
}

.form {
    display: flex;
    flex-direction: column;
    gap: var(--spacing-md);
}

.actions {
    margin-top: var(--spacing-sm);
}

.toggle-mode {
    text-align: center;
    font-size: var(--text-body-2);
    color: var(--color-text-secondary);
    margin-top: var(--spacing-md);

    a {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;

        &:hover {
            text-decoration: underline;
        }
    }
}

.error-alert {
    background: color-mix(in srgb, var(--color-error) 15%, transparent);
    color: var(--color-error);
    padding: 12px;
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    text-align: center;
}

.success-alert {
    background: color-mix(in srgb, var(--color-success) 15%, transparent);
    color: var(--color-success);
    padding: 12px;
    border-radius: var(--radius-sm);
    font-size: var(--text-caption);
    text-align: center;
}

/* Normalize browser autofill colors to match design system */
:deep(input:-webkit-autofill),
:deep(input:-webkit-autofill:hover),
:deep(input:-webkit-autofill:focus) {
    -webkit-text-fill-color: var(--color-text-primary);
    box-shadow: 0 0 0px 1000px var(--color-surface) inset;
    transition: background-color 9999s ease-in-out 0s;
}
</style>
