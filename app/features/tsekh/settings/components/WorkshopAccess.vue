<script setup lang="ts">
import { useWorkshopPin } from '../composables/useWorkshopPin'
import { clearClientFeedback, getClientFeedback, getUnreadClientFeedbackCount, redeemTemporaryPin, sendClientFeedback, type ClientMessage } from '~/features/license/services/license-client'

const { ready, locked, error, load, sync, unlock, configure } = useWorkshopPin()
const pin = ref('')
const failure = ref('')
const busy = ref(false)
const mustChangePin = ref(false)
const newPin = ref('')
const confirmPin = ref('')
const changeError = ref('')
const resetRequiredKey = 'workshop-pin-reset-required-v1'
const feedbackOpen = ref(false)
const feedbackText = ref('')
const feedbackError = ref('')
const feedbackSent = ref(false)
const feedbackBusy = ref(false)
const online = ref(true)
const feedbackMessages = ref<ClientMessage[]>([])
const unreadCount = ref(0)
const clientViewedChat = ref(false)
let feedbackTimer: number | undefined

function updateOnline() {
  online.value = navigator.onLine
  if (online.value) void refreshUnreadCount()
}

async function refreshUnreadCount() {
  if (!navigator.onLine) return
  try { unreadCount.value = await getUnreadClientFeedbackCount() } catch { /* keep the last known badge */ }
}

async function openFeedback() {
  feedbackOpen.value = true
  feedbackSent.value = false
  feedbackError.value = ''
  if (!navigator.onLine) return
  try {
    feedbackMessages.value = await getClientFeedback()
    clientViewedChat.value = true
    await refreshUnreadCount()
  } catch (cause) {
    feedbackError.value = cause instanceof Error ? cause.message : 'Не удалось загрузить сообщения.'
  }
}

async function sendFeedback() {
  if (!online.value) {
    feedbackError.value = 'Для отправки отзыва подключитесь к интернету.'
    return
  }
  const message = feedbackText.value.trim()
  if (!message || message.length > 1000) return
  feedbackBusy.value = true
  feedbackError.value = ''
  try {
    await sendClientFeedback(message)
    feedbackText.value = ''
    feedbackSent.value = true
    feedbackMessages.value = await getClientFeedback()
    clientViewedChat.value = true
    await refreshUnreadCount()
  } catch (cause) {
    feedbackError.value = cause instanceof Error ? cause.message : 'Не удалось отправить отзыв.'
  } finally {
    feedbackBusy.value = false
  }
}

async function submit() {
  if (busy.value) return
  busy.value = true
  failure.value = ''
  try {
    await unlock(pin.value)
    if (feedbackTimer) window.clearInterval(feedbackTimer)
    if (clientViewedChat.value) {
      feedbackOpen.value = false
      feedbackMessages.value = []
      clientViewedChat.value = false
      void clearClientFeedback().catch(() => {})
    }
  } catch (cause) {
    const localMessage = cause instanceof Error ? cause.message : 'Не удалось разблокировать приложение.'
    if (/^\d{4}$/.test(pin.value) && navigator.onLine) {
      try {
        await redeemTemporaryPin(pin.value)
        localStorage.setItem(resetRequiredKey, '1')
        mustChangePin.value = true
        locked.value = false
        return
      } catch (resetError) {
        failure.value = resetError instanceof Error ? resetError.message : localMessage
      }
    } else failure.value = localMessage
  } finally {
    pin.value = ''
    busy.value = false
  }
}

async function saveResetPin() {
  if (busy.value) return
  changeError.value = ''
  if (!/^\d{4}$/.test(newPin.value)) {
    changeError.value = 'Введите четыре цифры.'
    return
  }
  if (newPin.value !== confirmPin.value) {
    changeError.value = 'ПИН-коды не совпадают.'
    return
  }
  busy.value = true
  try {
    await configure(newPin.value)
    localStorage.removeItem(resetRequiredKey)
    mustChangePin.value = false
    newPin.value = ''
    confirmPin.value = ''
  } catch (cause) {
    changeError.value = cause instanceof Error ? cause.message : 'Не удалось сохранить новый ПИН-код.'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  online.value = navigator.onLine
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
  void refreshUnreadCount()
  feedbackTimer = window.setInterval(() => void refreshUnreadCount(), 30000)
  load()
  mustChangePin.value = localStorage.getItem(resetRequiredKey) === '1'
  if (mustChangePin.value) locked.value = false
  window.addEventListener('storage', sync)
  window.addEventListener('tsekh:lock-session', lockSession)
})
function lockSession() {
  pin.value = ''
  failure.value = ''
  locked.value = true
}
onBeforeUnmount(() => {
  window.removeEventListener('storage', sync)
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
  window.removeEventListener('tsekh:lock-session', lockSession)
  if (feedbackTimer) window.clearInterval(feedbackTimer)
})
</script>

<template>
  <slot v-if="ready && !locked && !mustChangePin" />
  <main v-else class="warehouse-shell settings-access">
    <button class="feedback-launch" type="button" aria-label="Сообщения администратору" title="Сообщения администратору" @click="openFeedback">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v8.5A2.75 2.75 0 0 1 17.25 17H10l-5.5 4v-5.13A2.74 2.74 0 0 1 4 13.25z"/><path d="M8 8h8M8 12h5"/></svg>
      <span class="feedback-unread" aria-live="polite">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <p v-if="!ready" class="inventory-muted" role="status">Загрузка цеха…</p>
    <form v-else-if="mustChangePin" class="inventory-panel dialog-content settings-access-form" @submit.prevent="saveResetPin">
      <h1>Задайте новый ПИН-код</h1>
      <p>Временный PIN принят. Сохраните свой постоянный PIN в настройках доступа.</p>
      <label class="inventory-field">Новый ПИН-код
        <input v-model="newPin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required autofocus :disabled="busy" />
      </label>
      <label class="inventory-field">Повторите ПИН-код
        <input v-model="confirmPin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required :disabled="busy" />
      </label>
      <p v-if="changeError" class="inventory-message error" role="alert">{{ changeError }}</p>
      <button type="submit" class="inventory-button primary" :disabled="busy">Сохранить PIN и открыть приложение</button>
    </form>
    <form v-else class="inventory-panel dialog-content settings-access-form" @submit.prevent="submit">
      <h1>Доступ к «Цеху-4»</h1>
      <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
      <template v-else>
        <label class="inventory-field">ПИН-код
          <input v-model="pin" type="password" inputmode="numeric" maxlength="4" pattern="[0-9]{4}" required autofocus />
        </label>
        <p v-if="failure" class="inventory-message error" role="alert">{{ failure }}</p>
        <button type="submit" class="inventory-button primary" :disabled="busy">Открыть приложение</button>
        <p class="inventory-muted">Если вы забыли PIN, подключитесь к интернету и запросите временный код у администратора.</p>
      </template>
    </form>
    <div v-if="feedbackOpen" class="feedback-overlay" @click.self="feedbackOpen = false">
      <form class="feedback-dialog" role="dialog" aria-modal="true" aria-labelledby="feedback-title" @submit.prevent="sendFeedback">
        <button class="feedback-close" type="button" aria-label="Закрыть" @click="feedbackOpen = false">×</button>
        <h2 id="feedback-title">Сообщения</h2>
        <p class="feedback-intro">Ваши сообщения и ответы администратора. Статус изменится после просмотра получателем.</p>
        <p class="feedback-warning" :class="{ offline: !online }" role="status">{{ online ? 'Для отправки отзыва необходимо подключение к интернету.' : 'Сейчас нет интернета. Подключитесь к сети, чтобы отправить отзыв.' }}</p>
        <div class="feedback-message-list" aria-live="polite">
          <p v-if="!feedbackMessages.length" class="feedback-intro">Сообщений пока нет.</p>
          <article v-for="item in feedbackMessages" :key="item.id" class="feedback-message" :class="{ admin: item.sender === 'admin' }">
            <div class="feedback-message-meta"><strong>{{ item.sender === 'admin' ? 'Администратор' : 'Вы' }}</strong><time>{{ new Date(item.created_at * 1000).toLocaleString('ru-RU') }}</time></div>
            <p>{{ item.message }}</p>
            <small>{{ item.read_at ? 'Просмотрено' : 'Отправлено' }}</small>
          </article>
        </div>
        <label class="feedback-label" for="feedback-message">Новое сообщение</label>
        <textarea id="feedback-message" v-model="feedbackText" maxlength="1000" rows="3" placeholder="Напишите сообщение…" :disabled="feedbackBusy" @input="feedbackSent = false"></textarea>
        <div class="feedback-footer"><span>{{ feedbackText.length }}/1000</span><span v-if="feedbackSent" class="feedback-success" role="status">Сообщение отправлено.</span></div>
        <p v-if="feedbackError" class="feedback-error" role="alert">{{ feedbackError }}</p>
        <div class="feedback-actions">
          <button class="inventory-button secondary" type="button" @click="feedbackOpen = false">Закрыть</button>
          <button class="inventory-button primary" type="submit" :disabled="feedbackBusy || !online || !feedbackText.trim() || feedbackSent">{{ feedbackBusy ? 'Отправка…' : 'Отправить' }}</button>
        </div>
      </form>
    </div>
  </main>
</template>

<style src="../assets/settings.css"></style>
<style>
.feedback-launch { position:fixed; z-index:4; right:24px; bottom:24px; display:grid; place-items:center; width:48px; height:48px; border:1px solid #c8d8b2; border-radius:50%; color:#335317; background:#b8ef61; box-shadow:0 5px 18px #1c2d4326; cursor:pointer; }
.feedback-launch:hover { background:#a9e64b; }
.feedback-launch svg { width:23px; height:23px; fill:none; stroke:currentColor; stroke-width:1.8; stroke-linecap:round; stroke-linejoin:round; }
.feedback-overlay { position:fixed; z-index:20; inset:0; display:grid; place-items:center; padding:18px; background:#13223680; }
.feedback-dialog { position:relative; display:grid; gap:12px; width:min(100%,480px); padding:26px; border:1px solid #e0e6ed; border-radius:16px; background:#fff; box-shadow:0 18px 50px #18283a26; color:#17243a; }
.feedback-dialog h2 { margin:0; font-size:21px; }
.feedback-intro { margin:0; color:#68768b; line-height:1.5; }
.feedback-close { position:absolute; top:10px; right:13px; width:32px; height:32px; border:0; color:#68768b; background:transparent; font-size:24px; cursor:pointer; }
.feedback-warning { margin:0; padding:10px 12px; border-radius:9px; color:#536d33; background:#f3f8e9; font-size:13px; }
.feedback-warning.offline { color:#885900; background:#fff3d2; }
.feedback-label { color:#33445c; font-size:13px; font-weight:700; }
.feedback-dialog textarea { width:100%; resize:vertical; padding:11px; border:1px solid #cbd5e1; border-radius:9px; font:inherit; }
.feedback-dialog textarea:focus { outline:2px solid #82aa45; outline-offset:1px; }
.feedback-footer { display:flex; justify-content:space-between; gap:10px; color:#68768b; font-size:12px; }
.feedback-success { color:#347343; }
.feedback-unread { position:absolute; top:-5px; right:-5px; display:grid; place-items:center; min-width:19px; height:19px; padding:0 4px; border:1px solid white; border-radius:12px; color:#fff; background:#d72e35; font-size:10px; font-weight:800; }
.feedback-message-list { display:grid; gap:8px; max-height:250px; overflow:auto; padding:2px 3px 2px 0; }
.feedback-message { padding:11px 12px; border:1px solid #dfe6ed; border-radius:10px; background:#f8fafc; }
.feedback-message.admin { border-color:#d7e8bd; background:#f7fbf0; }
.feedback-message-meta { display:flex; justify-content:space-between; gap:10px; color:#68768b; font-size:11px; }
.feedback-message-meta time { text-align:right; }
.feedback-message p { margin:8px 0; white-space:pre-wrap; overflow-wrap:anywhere; line-height:1.45; }
.feedback-message small { color:#68768b; font-size:10px; }
.feedback-error { margin:0; color:#b42318; font-size:13px; }
.feedback-actions { display:flex; justify-content:flex-end; gap:8px; }
@media (max-width:520px) { .feedback-launch { right:16px; bottom:16px; } .feedback-dialog { padding:23px 18px; } }
</style>
