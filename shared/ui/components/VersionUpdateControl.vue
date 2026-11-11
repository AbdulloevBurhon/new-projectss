<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue'
import BaseButton from './BaseButton.vue'
import BaseModal from './BaseModal.vue'
import ConnectionIndicator from './ConnectionIndicator.vue'
import { useOnlineStatus } from '../composables/useOnlineStatus'

const props = defineProps<{ currentVersion: string; availableVersion?: string | null }>()
const current = ref(props.currentVersion)
const available = ref(props.availableVersion ?? null)
const open = ref(false)
const progress = ref(0)
const updating = ref(false)
const done = ref(false)
const { isOnline } = useOnlineStatus()
let timer: ReturnType<typeof setInterval> | undefined
watch(() => props.availableVersion, value => { available.value = value ?? null })
watch(isOnline, online => { if (!online && updating.value) stop() })

function stop() {
  if (timer) clearInterval(timer)
  timer = undefined
  updating.value = false
}
function update() {
  if (!isOnline.value || !available.value || updating.value) return
  done.value = false
  updating.value = true
  timer = setInterval(() => {
    if (!isOnline.value) return stop()
    progress.value = Math.min(progress.value + 5, 100)
    if (progress.value === 100) {
      stop()
      current.value = available.value!
      available.value = null
      done.value = true
    }
  }, 100)
}
function close() {
  if (updating.value) return
  open.value = false
  progress.value = 0
  done.value = false
}
onUnmounted(stop)
</script>

<template>
  <div class="mt-3 flex flex-wrap items-center gap-2 text-xs">
    <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 font-semibold text-slate-600">VERSION {{ current }}</span>
    <button v-if="available" type="button" class="inline-flex items-center gap-1.5 rounded-full border border-lime-300 bg-lime-50 px-2.5 py-1 font-semibold text-lime-800 hover:bg-lime-100" @click="open = true">
      <span class="rounded-full bg-lime-300 px-1.5 py-0.5 text-[9px] font-bold uppercase">New</span> VERSION {{ available }}
    </button>
    <span v-if="done" class="font-medium text-emerald-700">Версия обновлена</span>
  </div>

  <BaseModal :open="open" title="Обновление программы" @close="close">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p v-if="!done" class="font-medium text-slate-900">Хотите обновлять программу?</p>
        <p class="mt-1 text-sm text-slate-600">{{ done ? `Текущая версия: VERSION ${current}` : `VERSION ${current} → VERSION ${available}` }}</p>
      </div>
      <ConnectionIndicator class="shrink-0" />
    </div>
    <p v-if="!isOnline" class="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">Интернет отключён. Подключитесь к сети, чтобы продолжить обновление.</p>
    <p v-else-if="progress > 0 && !done" class="mt-4 text-sm text-slate-600">Загрузка обновления{{ updating ? '…' : ' приостановлена' }}</p>
    <div v-if="progress > 0 && !done" class="mt-2 flex items-center gap-3 rounded-full bg-slate-100 p-1.5" role="progressbar" :aria-valuenow="progress" aria-valuemin="0" aria-valuemax="100">
      <div class="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-200"><div class="h-full rounded-full bg-lime-400 transition-[width] duration-100" :style="{ width: `${progress}%` }" /></div>
      <span class="min-w-10 text-right text-xs font-semibold text-slate-700">{{ progress }}%</span>
    </div>
    <p v-if="done" class="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700" role="status">Обновление завершено. Установлена VERSION {{ current }}.</p>
    <template #footer>
      <BaseButton :disabled="updating" @click="close">{{ done ? 'Готово' : 'Отмена' }}</BaseButton>
      <BaseButton v-if="!done" variant="primary" :disabled="!isOnline || updating" @click="update">
        <span v-if="updating" class="inline-flex items-center gap-2"><span class="size-4 animate-spin rounded-full border-2 border-slate-900/30 border-t-slate-900" aria-hidden="true" />Обновление…</span>
        <span v-else>{{ progress > 0 ? 'Продолжить' : 'Обновлять' }}</span>
      </BaseButton>
    </template>
  </BaseModal>
</template>
