<script setup lang="ts">
import WorkshopIcon from '~/features/shawarma/components/ShawarmaIcon.vue'
import { useProductPin } from '~/features/license/composables/useProductPin'

const { configured, configure, clear, lock } = useProductPin('shawarma')
const pin = ref('')
const shown = ref(false)
const busy = ref(false)
const error = ref('')

async function save() {
  if (busy.value) return
  busy.value = true
  error.value = ''
  try {
    await configure(pin.value)
    pin.value = ''
    shown.value = false
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Не удалось сохранить ПИН-код.'
  } finally {
    busy.value = false
  }
}

function reset() {
  error.value = ''
  try {
    clear()
    pin.value = ''
    shown.value = false
  } catch {
    error.value = 'Не удалось отключить ПИН-код.'
  }
}
</script>

<template>
  <section class="inventory-panel settings-card" aria-label="ПИН-код">
    <h2>ПИН-код</h2>
    <p class="inventory-muted">Четыре цифры для блокировки экрана на этом браузере.</p>
    <form class="settings-fields" @submit.prevent="save">
      <label class="inventory-field">{{ configured ? 'Новый ПИН-код' : 'ПИН-код' }}
        <input v-model="pin" :type="shown ? 'text' : 'password'" inputmode="numeric" autocomplete="new-password" maxlength="4" pattern="[0-9]{4}" required :disabled="busy" />
      </label>
      <div class="settings-actions">
        <button type="button" class="inventory-button secondary settings-icon" aria-label="Показать ПИН-код" :aria-pressed="shown" title="Показать или скрыть ПИН-код" @click="shown = !shown"><WorkshopIcon name="eye" /></button>
        <button type="submit" class="inventory-button primary settings-icon" aria-label="Сохранить ПИН-код" title="Сохранить ПИН-код" :disabled="busy"><WorkshopIcon name="save" /></button>
      </div>
    </form>
    <p class="inventory-muted" role="status">{{ configured ? 'ПИН-код установлен' : 'ПИН-код отключён' }}</p>
    <div v-if="configured" class="settings-actions">
      <button type="button" class="inventory-button secondary" :disabled="busy" @click="lock">Заблокировать</button>
      <button type="button" class="inventory-button secondary" :disabled="busy" @click="reset">Отключить</button>
    </div>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
  </section>
</template>
