<script setup lang="ts">
const code = ref('')
const error = ref('')

function enterDemo() {
  if (!/^\d{5}$/.test(code.value)) {
    error.value = 'Введите ровно 5 цифр.'
    return
  }
  sessionStorage.setItem('obshaya-admin-demo', '1')
  navigateTo('/')
}
</script>

<template>
  <main class="grid min-h-screen place-items-center bg-slate-100 p-5">
    <form class="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm" @submit.prevent="enterDemo">
      <p class="text-xs font-bold uppercase tracking-[0.18em] text-lime-700">Общая программа</p>
      <h1 class="mt-3 text-2xl font-semibold text-slate-900">Вход администратора</h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">Демо-режим макета. Введите любые пять цифр, чтобы открыть интерфейс.</p>
      <label for="admin-code" class="mb-1.5 mt-6 block text-sm font-medium text-slate-700">Код доступа</label>
      <input id="admin-code" v-model="code" inputmode="numeric" autocomplete="one-time-code" maxlength="5" placeholder="•••••" class="w-full rounded-lg border border-slate-300 px-3 py-3 text-center text-lg tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
      <p v-if="error" role="alert" class="mt-2 text-sm text-red-600">{{ error }}</p>
      <button class="mt-5 w-full rounded-lg bg-lime-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-lime-200">Продолжить</button>
      <p class="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">Это только прототип: введённые цифры не проверяются сервером и не защищают админ-панель.</p>
    </form>
  </main>
</template>
