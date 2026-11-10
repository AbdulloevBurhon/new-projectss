<script setup lang="ts">
import { useAdminStore } from '../stores/admin.store'

const store = useAdminStore()
const key = ref('')
const error = ref('')
const busy = ref(false)
async function submit() {
  busy.value = true; error.value = ''
  try { await store.login(key.value); await navigateTo('/admin/requests') }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось войти.' }
  finally { busy.value = false }
}
</script>

<template>
  <main class="grid min-h-screen place-items-center p-5">
    <form class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-sm" @submit.prevent="submit">
      <p class="text-xs font-bold uppercase tracking-widest text-lime-700">Общая программа</p>
      <h1 class="mt-3 text-2xl font-semibold">Вход администратора</h1>
      <p class="mt-2 text-sm text-slate-600">Введите секретный ключ Worker. Он хранится только до закрытия вкладки.</p>
      <label class="mt-6 block text-sm font-medium">Ключ администратора<input v-model="key" required type="password" autocomplete="current-password" class="mt-2 w-full rounded-lg border border-slate-300 px-3 py-3"></label>
      <p v-if="error" role="alert" class="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>
      <button class="mt-5 w-full rounded-lg bg-lime-300 px-4 py-3 font-semibold disabled:opacity-60" :disabled="busy">{{ busy ? 'Проверка…' : 'Войти' }}</button>
    </form>
  </main>
</template>
