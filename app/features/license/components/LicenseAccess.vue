<script setup lang="ts">
import { appVersion, clearActivationRequest, createActivationRequest, getActivationStatus, getDeviceId, readActivationRequest, readStoredLicense, saveStoredLicense, syncStoredLicense, verifyLicense } from '../services/license-client'
import { savePin } from '~/features/license/services/local-pin'
import type { ProductId } from '~~/shared/contracts/product'

const ready = ref(false)
const active = ref(false)
const requestId = ref('')
const state = ref<'idle' | 'sending' | 'pending' | 'approved' | 'rejected' | 'revoked' | 'offline' | 'error'>('idle')
const error = ref('')
const issuedPin = ref('')
const showPin = ref(false)
const deviceShort = ref('')
const licenseExpires = ref('')
const productId = ref<ProductId>('tsekh')
let pollTimer: number | undefined
let licenseTimer: number | undefined
let syncTimer: number | undefined

const statusText = computed(() => ({
  idle: 'Отправьте заявку администратору.',
  sending: 'Отправляем заявку…',
  pending: 'Заявка отправлена. Ожидайте решения администратора.',
  approved: 'Лицензия одобрена.',
  rejected: 'Заявка отклонена. Пожалуйста, отправьте заявку заново.',
  revoked: 'Доступ отключён или срок лицензии закончился. Подключитесь к интернету и отправьте заявку заново.',
  offline: 'Нет интернета. Подключитесь к сети — заявка отправится автоматически.',
  error: 'Не удалось связаться с сервером лицензий.',
}[state.value]))

async function poll() {
  if (!requestId.value || !navigator.onLine || active.value) return
  try {
    const result = await getActivationStatus(requestId.value)
    if (result.status === 'approved' && result.license) {
      if (!await verifyLicense(result.license)) throw new Error('Подпись лицензии не прошла проверку.')
      if (result.license.payload.expiresAt <= Date.now() / 1000) {
        state.value = 'revoked'
        clearInterval(pollTimer)
        return
      }
      saveStoredLicense(result.license)
      productId.value = result.license.payload.productId || 'tsekh'
      clearActivationRequest()
      requestId.value = ''
      licenseExpires.value = new Date(result.license.payload.expiresAt * 1000).toLocaleDateString('ru-RU')
      const pin = String(crypto.getRandomValues(new Uint32Array(1))[0] % 9000 + 1000)
      await savePin(pin, productId.value)
      sessionStorage.setItem('obshaya-first-pin', pin)
      issuedPin.value = pin
      state.value = 'approved'
      clearInterval(pollTimer)
      return
    }
    if (result.status === 'rejected') {
      state.value = 'rejected'
      clearActivationRequest()
      requestId.value = ''
      clearInterval(pollTimer)
    }
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось проверить заявку.'
    state.value = 'error'
  }
}
function beginPolling() {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = window.setInterval(() => void poll(), 5000)
}
async function sendRequest() {
  if (!navigator.onLine) {
    state.value = 'offline'
    return
  }
  state.value = 'sending'
  error.value = ''
  try {
    productId.value = 'tsekh'
    const result = await createActivationRequest('tsekh')
    requestId.value = result.requestId
    state.value = result.status === 'pending' ? 'pending' : 'idle'
    beginPolling()
    await poll()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось отправить заявку.'
    state.value = 'error'
  }
}
async function refreshLicense() {
  if (!navigator.onLine || !readStoredLicense()) return
  try {
    const updated = await syncStoredLicense()
    if (updated && updated.payload.expiresAt > Date.now() / 1000) {
      productId.value = updated.payload.productId || 'tsekh'
      active.value = true
      error.value = ''
      state.value = 'idle'
      licenseExpires.value = new Date(updated.payload.expiresAt * 1000).toLocaleDateString('ru-RU')
    } else {
      active.value = false
      state.value = 'revoked'
      await navigateTo('/activation')
    }
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : ''
    if (message.includes('Лицензия закончилась') || message.includes('отключена')) {
      active.value = false
      error.value = ''
      state.value = 'revoked'
      await navigateTo('/activation')
    }
  }
}
function retryOnline() {
  if (readStoredLicense()) {
    void refreshLicense()
    return
  }
  if (!navigator.onLine) {
    state.value = 'offline'
    return
  }
  if (requestId.value) {
    state.value = 'pending'
    beginPolling()
    void poll()
  } else if (state.value === 'offline') {
    void sendRequest()
  }
}
function refreshWhenVisible() {
  if (document.visibilityState === 'visible' && navigator.onLine) void refreshLicense()
}
function finishActivation() {
  active.value = true
  showPin.value = false
  sessionStorage.removeItem('obshaya-first-pin')
  void navigateTo(productId.value === 'tsekh' ? '/tsekh' : '/shawarma')
}
onMounted(async () => {
  try {
    deviceShort.value = getDeviceId().slice(0, 8)
    const unconfirmedPin = sessionStorage.getItem('obshaya-first-pin')
    if (unconfirmedPin) {
      issuedPin.value = unconfirmedPin
      const savedLicense = readStoredLicense()
      if (savedLicense) {
        productId.value = savedLicense.payload.productId || 'tsekh'
        licenseExpires.value = new Date(savedLicense.payload.expiresAt * 1000).toLocaleDateString('ru-RU')
        state.value = 'approved'
      }
      return
    }
    const saved = readStoredLicense()
    if (saved && await verifyLicense(saved) && saved.payload.expiresAt > Date.now() / 1000) {
      productId.value = saved.payload.productId || 'tsekh'
      active.value = true
      licenseExpires.value = new Date(saved.payload.expiresAt * 1000).toLocaleDateString('ru-RU')
      if (navigator.onLine) void refreshLicense()
      if (useRoute().path === '/activation') void navigateTo(productId.value === 'tsekh' ? '/tsekh' : '/shawarma')
    } else {
      requestId.value = readActivationRequest()
      if (saved) {
        productId.value = saved.payload.productId || 'tsekh'
        state.value = 'revoked'
        if (useRoute().path !== '/activation') void navigateTo('/activation')
      }
      if (requestId.value && navigator.onLine) {
        state.value = 'pending'
        beginPolling()
        void poll()
      } else if (!navigator.onLine) state.value = 'offline'
    }
    licenseTimer = window.setInterval(() => {
      const current = readStoredLicense()
      if (current && current.payload.expiresAt <= Date.now() / 1000) {
        active.value = false
        error.value = ''
        state.value = 'revoked'
        void navigateTo('/activation')
      }
    }, 30_000)
    syncTimer = window.setInterval(() => void refreshLicense(), 10_000)
    window.addEventListener('online', retryOnline)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось проверить лицензию.'
    state.value = 'error'
  } finally {
    ready.value = true
  }
})
onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  if (licenseTimer) clearInterval(licenseTimer)
  if (syncTimer) clearInterval(syncTimer)
  window.removeEventListener('online', retryOnline)
  document.removeEventListener('visibilitychange', refreshWhenVisible)
  window.removeEventListener('focus', refreshWhenVisible)
})
</script>

<template>
  <slot v-if="ready && active" :product-id="productId" />
  <main v-else class="license-shell">
    <section class="license-card">
      <div class="license-brand"><span>{{ issuedPin && productId === 'shawarma' ? 'Ш' : 'Ц' }}</span><small>{{ issuedPin && productId === 'shawarma' ? 'ШАУРМИЧНАЯ ПРОГРАММА' : issuedPin ? 'УПРАВЛЕНИЕ ЦЕХОМ' : 'УПРАВЛЕНИЕ ПРОГРАММОЙ' }}</small></div>
      <div class="license-globe" :class="{ online: typeof navigator !== 'undefined' && navigator.onLine }" :title="typeof navigator !== 'undefined' && navigator.onLine ? 'Интернет подключён' : 'Нет интернета'">◎</div>
      <p class="license-eyebrow">ДОСТУП К ПРОГРАММЕ</p>
      <h1>{{ issuedPin ? 'Запишите ваш PIN-код' : 'Активация программы' }}</h1>
      <p v-if="issuedPin">Лицензия одобрена до {{ licenseExpires }}. Этот PIN понадобится для входа. Запишите его сейчас.</p>
      <p v-else>{{ statusText }}</p>
      <div v-if="issuedPin" class="license-pin">{{ showPin ? issuedPin : '••••' }}
        <button type="button" aria-label="Показать PIN" @click="showPin = !showPin">{{ showPin ? 'Скрыть' : 'Показать' }}</button>
      </div>
      <button v-if="issuedPin" class="license-button primary" type="button" @click="finishActivation">Я записал PIN — продолжить</button>
      <button v-else-if="state === 'idle' || state === 'offline' || state === 'rejected' || state === 'revoked' || state === 'error'" class="license-button primary" type="button" :disabled="state === 'sending'" @click="sendRequest">
        {{ state === 'rejected' || state === 'revoked' ? 'Отправить заявку заново' : 'Отправить заявку администратору' }}
      </button>
      <div v-else class="license-wait" role="status"><span class="spinner"></span> Ожидание решения администратора</div>
      <p v-if="error" class="license-error" role="alert">{{ error }}</p>
      <p class="license-foot">Установка: {{ deviceShort }} · версия {{ appVersion }}</p>
    </section>
  </main>
</template>

<style>
.license-shell { min-height:100vh; display:grid; place-items:center; padding:20px; background:#f4f6f4; color:#17243a; font-family:Inter,ui-sans-serif,system-ui,sans-serif; }
.license-card { position:relative; display:grid; gap:14px; width:min(100%,440px); padding:34px; border:1px solid #e0e6ed; border-radius:18px; background:#fff; box-shadow:0 18px 50px #18283a12; }
.license-brand { display:flex; align-items:center; gap:10px; color:#607747; font-size:10px; font-weight:800; letter-spacing:.12em; }
.license-brand span { display:grid; place-items:center; width:34px; height:34px; border-radius:10px; color:#31511c; background:#b8ef61; font-size:13px; letter-spacing:0; }
.license-globe { position:absolute; top:28px; right:30px; color:#d68e28; font-size:25px; }
.license-globe.online { color:#4b9a52; }
.license-eyebrow { margin:12px 0 -8px; color:#718346; font-size:10px; font-weight:800; letter-spacing:.14em; }
.license-card h1 { margin:0; font-size:27px; letter-spacing:-.035em; }
.license-card p { margin:0; color:#68768b; line-height:1.55; }
.license-button { min-height:43px; padding:10px 15px; border:1px solid #d7e0e9; border-radius:10px; font:700 14px inherit; cursor:pointer; }
.license-button.primary { color:#263d12; border-color:#b8ef61; background:#b8ef61; }
.license-button:disabled { opacity:.6; cursor:wait; }
.license-product { display:grid; gap:6px; color:#52627a; font-size:13px; }
.license-product select { min-height:42px; padding:0 12px; border:1px solid #d7e0e9; border-radius:10px; color:#17243a; background:#fff; font:inherit; }
.license-pin { display:flex; justify-content:space-between; align-items:center; padding:12px 14px; border:1px dashed #aac986; border-radius:10px; color:#335317; background:#f6fbeF; font:800 24px ui-monospace,monospace; letter-spacing:.15em; }
.license-pin button { border:0; color:#536d33; background:transparent; font:600 12px inherit; letter-spacing:0; cursor:pointer; }
.license-wait { display:flex; align-items:center; gap:10px; min-height:42px; color:#715a27; }
.spinner { width:17px; height:17px; border:2px solid #ecdba8; border-top-color:#9a7622; border-radius:50%; animation:license-spin .8s linear infinite; }
@keyframes license-spin { to { transform:rotate(360deg); } }
.license-error { color:#b42318 !important; font-size:13px; }
.license-foot { padding-top:10px; border-top:1px solid #edf0f3; font-size:11px; }
</style>
