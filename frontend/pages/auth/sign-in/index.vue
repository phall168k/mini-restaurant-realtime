<script setup lang="ts">
import { ArrowRight, Lock, User, KnifeFork, Check } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import type { ISignIn } from '~/types/sign-in'

definePageMeta({ layout: 'auth' })
const { t } = useI18n()
const auth = useAuthStore()
const form = ref<FormInstance>()
const formData = ref<ISignIn>({ username: '', password: '' })
const loading = ref(false)
const error = ref('')
const rules = computed<FormRules>(() => ({
  username: [{ required: true, whitespace: true, message: t('sign_in.username_required'), trigger: 'blur' }],
  password: [{ required: true, message: t('sign_in.password_required'), trigger: 'blur' }],
}))
async function signIn() {
  if (loading.value) return
  loading.value = true
  error.value = ''
  try {
    if (!await form.value?.validate().catch(() => false)) return
    await auth.handleSignIn({ ...formData.value, username: formData.value.username.trim() })
  } catch {
    error.value = t('sign_in.error')
  } finally { loading.value = false }
}
</script>

<template>
  <main class="sign-in-page">
    <section class="sign-in-story" :aria-label="t('app.name')">
      <div class="sign-in-brand">
        <span class="brand-mark"><KnifeFork aria-hidden="true" /></span>
        <div><strong>{{ t('app.name') }}</strong><span>{{ t('sign_in.workspace') }}</span></div>
      </div>
      <div class="story-content">
        <p class="story-eyebrow">{{ t('sign_in.eyebrow') }}</p>
        <h1>{{ t('sign_in.headline') }}</h1>
        <p class="story-description">{{ t('sign_in.story') }}</p>
        <!-- Decorative place setting: CSS shapes keep the page lightweight. -->
        <div class="place-setting" aria-hidden="true">
          <div class="setting-orbit" />
          <div class="setting-plate"><div class="plate-center"><KnifeFork /><span>MINI RESTAURANT</span></div></div>
          <div class="setting-leaf leaf-one" /><div class="setting-leaf leaf-two" />
          <div class="setting-badge"><Check /><span>{{ t('sign_in.together') }}</span></div>
        </div>
      </div>
      <p class="story-footer">{{ t('sign_in.team_note') }}</p>
    </section>

    <section class="sign-in-panel" aria-labelledby="sign-in-heading">
      <div class="sign-in-form-wrap text-center">
        <div class="mobile-brand"><span class="brand-mark"><KnifeFork aria-hidden="true" /></span><strong>{{ t('app.name') }}</strong></div>
        <span class="welcome-icon"><User aria-hidden="true" /></span>
        <p class="form-eyebrow">{{ t('sign_in.workspace') }}</p>
        <h2 id="sign-in-heading">{{ t('sign_in.welcome') }}</h2>
        <p class="form-description">{{ t('sign_in.description') }}</p>
        <el-alert v-if="error" class="sign-in-error" :title="error" type="error" show-icon :closable="false" role="alert" />
        <el-form ref="form" :model="formData" :rules="rules" label-position="top" class="sign-in-form" :disabled="loading" @submit.prevent="signIn">
          <el-form-item prop="username" :label="t('sign_in.username')" for="sign-in-username">
            <el-input id="sign-in-username" v-model="formData.username" name="username" autocomplete="username" autocapitalize="none" :spellcheck="false" :prefix-icon="User" :placeholder="t('sign_in.username_placeholder')" size="large" />
          </el-form-item>
          <el-form-item prop="password" :label="t('sign_in.password')" for="sign-in-password">
            <el-input id="sign-in-password" v-model="formData.password" name="password" type="password" autocomplete="current-password" show-password :prefix-icon="Lock" :placeholder="t('sign_in.password_placeholder')" size="large" />
          </el-form-item>
          <el-button class="sign-in-submit" type="primary" native-type="submit" :loading="loading" :disabled="loading" size="large">
            <span>{{ t(loading ? 'sign_in.signing_in' : 'sign_in.sign_in') }}</span><el-icon v-if="!loading"><ArrowRight /></el-icon>
          </el-button>
        </el-form>
        <div class="sign-in-help"><Lock aria-hidden="true" /><p>{{ t('sign_in.help') }}</p></div>
      </div>
      <footer class="panel-footer">{{ t('app.name') }} <span aria-hidden="true">·</span> {{ t('sign_in.workspace') }}</footer>
    </section>
  </main>
</template>

<style scoped>
.sign-in-page { min-height: 100vh; min-height: 100dvh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); background: #fafbf9; color: #172c29; }
.sign-in-story { position: relative; display: flex; flex-direction: column; overflow: hidden; padding: 44px clamp(32px, 5vw, 88px) 30px; background: #123f37; color: #f8f6ee; }
.sign-in-story::before { content: ''; position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse at 90% 65%, #266252 0, transparent 65%); }
.sign-in-brand, .story-content, .story-footer { position: relative; z-index: 1; }
.sign-in-brand { display: flex; align-items: center; gap: 13px; }
.brand-mark { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; flex-shrink: 0; border: 1px solid #ffffff30; border-radius: 14px; background: #ffffff0d; }
.brand-mark svg { width: 23px; height: 23px; }
.sign-in-brand strong { display: block; font-size: 16px; font-weight: 600; }
.sign-in-brand div > span { display: block; margin-top: 4px; font-size: 11px; color: #b1c8bc; }
.story-content { margin: auto 0; padding-top: 64px; }
.story-eyebrow, .form-eyebrow { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: .16em; }
.story-eyebrow { color: #d3d7a4; margin-bottom: 20px; }
.story-content h1 { max-width: 560px; font-size: clamp(32px, 3.5vw, 54px); line-height: 1.3; font-weight: 500; letter-spacing: -.035em; text-wrap: balance; }
.story-description { max-width: 420px; margin-top: 24px; color: #bed0c5; font-size: 14px; line-height: 1.9; }
.place-setting { position: relative; height: 280px; max-width: 380px; margin: 30px auto 8px; display: grid; place-items: center; }
.setting-orbit { position: absolute; width: 310px; height: 250px; border: 1px solid #d3d7a430; border-radius: 50%; transform: rotate(-25deg); }
.setting-plate { width: 225px; height: 225px; border-radius: 50%; background: #eeeadd; padding: 25px; box-shadow: 12px 24px 45px #061f3540, inset 0 0 0 10px #f8f5eb, inset 0 0 0 12px #ddd9ca; transform: rotate(-12deg); }
.plate-center { height: 100%; border: 1px solid #d7d4c5; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 17px; color: #38685a; box-shadow: inset 0 4px 12px #b8b3a52b; }
.plate-center svg { width: 54px; height: 54px; }
.plate-center span { font-size: 8px; letter-spacing: .18em; }
.setting-leaf { position: absolute; width: 60px; height: 100px; border-radius: 0 90% 0 90%; background: #7d9665; box-shadow: inset 4px 0 0 #a7b78455; }
.leaf-one { right: 24px; top: 25px; transform: rotate(25deg); }
.leaf-two { right: 0; top: 75px; transform: rotate(65deg) scale(.7); background: #9aa976; }
.setting-badge { position: absolute; bottom: 10px; left: 0; display: flex; align-items: center; gap: 9px; padding: 12px 16px; border: 1px solid #ffffff30; border-radius: 14px; background: #244f42; color: #f4f2e5; font-size: 12px; box-shadow: 0 8px 24px #072c3326; }
.setting-badge svg { width: 18px; height: 18px; color: #d3d7a4; }
.story-footer { margin-top: 35px; font-size: 11px; color: #a9c0b2; }
.sign-in-panel { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 64px 32px 28px; }
.sign-in-form-wrap { width: 100%; max-width: 400px; margin: auto 0; padding: 36px 0; }
.mobile-brand { display: none; }
.welcome-icon { display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; border: 1px solid #dce9e1; border-radius: 15px; background: #edf3ee; color: #286858; margin-bottom: 28px; }
.welcome-icon svg { width: 24px; height: 24px; }
.form-eyebrow { color: #58806e; margin-bottom: 10px; }
.sign-in-form-wrap h2 { font-size: clamp(28px, 3vw, 36px); font-weight: 600; line-height: 1.4; letter-spacing: -.03em; }
.form-description { margin-top: 12px; color: #738079; font-size: 14px; line-height: 1.8; }
.sign-in-form { margin-top: 32px; }
.sign-in-error { margin-top: 24px; border-radius: 12px; }
.sign-in-form :deep(.el-form-item) { margin-bottom: 25px; }
.sign-in-form :deep(.el-form-item__label) { color: #344c41; font-size: 13px; font-weight: 600; padding-bottom: 9px; }
.sign-in-form :deep(.el-input__wrapper) { min-height: 50px; padding: 0 15px; border-radius: 11px; background: #fff; box-shadow: 0 0 0 1px #dce3de inset; transition: box-shadow .15s; }
.sign-in-form :deep(.el-input__wrapper.is-focus) { box-shadow: 0 0 0 1px #287562 inset, 0 0 0 3px #28756218; }
.sign-in-form :deep(.is-error .el-input__wrapper) { box-shadow: 0 0 0 1px #dc5262 inset; }
.sign-in-form :deep(.el-input__prefix) { margin-right: 5px; color: #879b8f; }
.sign-in-submit { width: 100%; min-height: 50px; margin-top: 4px; border-radius: 11px; font-weight: 600; --el-button-bg-color: #21634f; --el-button-border-color: #21634f; --el-button-hover-bg-color: #194e3e; --el-button-hover-border-color: #194e3e; --el-button-active-bg-color: #123f37; --el-button-active-border-color: #123f37; box-shadow: 0 5px 12px #21634f18; }
.sign-in-submit :deep(.el-icon) { margin-left: 12px; }
.sign-in-submit:focus-visible { outline: 2px solid #21634f; outline-offset: 4px; }
.sign-in-help { display: flex; align-items: flex-start; gap: 9px; margin-top: 28px; padding-top: 23px; border-top: 1px solid #e4e9e3; color: #7d8880; font-size: 12px; line-height: 1.8; }
.sign-in-help svg { flex-shrink: 0; width: 15px; height: 15px; margin-top: 3px; }
.panel-footer { display: flex; flex-wrap: wrap; justify-content: center; gap: 9px; margin-top: 36px; color: #8a958d; font-size: 11px; }
@media (max-width: 900px) { .sign-in-page { grid-template-columns: 1fr; } .sign-in-story { display: none; } .sign-in-panel { min-height: 100vh; min-height: 100dvh; padding: 24px; } .mobile-brand { display: flex; align-items: center; gap: 12px; margin-bottom: 42px; font-size: 16px; } .mobile-brand .brand-mark { color: #21634f; background: #eaf1eb; border-color: #dce9e1; } .welcome-icon { display: none; } .sign-in-form-wrap { padding: 12px 0; } }
@media (prefers-reduced-motion: reduce) { .sign-in-form :deep(.el-input__wrapper) { transition: none; } }
</style>
