<script setup lang="ts">
import WorkshopIcon from '~/features/tsekh/components/WorkshopIcon.vue'

const photo = defineModel<string>({ required: true })
const loading = defineModel<boolean>('loading', { required: true })
defineProps<{ disabled?: boolean }>()
const error = ref('')

async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return

  error.value = ''
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 12 * 1024 * 1024) {
    error.value = 'Выберите JPG, PNG или WebP до 12 МБ.'
    return
  }

  loading.value = true
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const scale = Math.min(1, 960 / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Не удалось обработать фото.')
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const data = canvas.toDataURL('image/webp', 0.78)
      if (!data.startsWith('data:image/') || data.length > 500_000) {
        throw new Error('Фото слишком большое. Выберите изображение меньшего размера.')
      }
      photo.value = data
    } finally {
      bitmap.close()
    }
  } catch (cause) {
    error.value = cause instanceof Error && !(cause instanceof DOMException)
      ? cause.message
      : 'Не удалось открыть фото.'
  } finally {
    loading.value = false
  }
}

function remove() {
  photo.value = ''
  error.value = ''
}
</script>

<template>
  <div class="techcard-photo-field">
    <div class="techcard-photo">
      <img v-if="photo" :src="photo" alt="Фото изделия" />
      <div v-else class="techcard-photo-empty">
        <WorkshopIcon name="products" />
        <strong>Фото изделия</strong>
        <span>JPG, PNG или WebP</span>
      </div>
    </div>
    <div class="techcard-photo-actions">
      <label class="inventory-button secondary techcard-upload" :class="{ 'is-disabled': disabled || loading }">
        {{ loading ? 'Обработка…' : photo ? 'Заменить фото' : 'Загрузить фото' }}
        <input class="sr-only" aria-label="Фото изделия" type="file" accept="image/jpeg,image/png,image/webp" :disabled="disabled || loading" @change="upload" />
      </label>
      <button v-if="photo" type="button" class="inventory-button secondary" :disabled="disabled || loading" @click="remove">Убрать фото</button>
    </div>
    <p v-if="error" class="inventory-message error" role="alert">{{ error }}</p>
  </div>
</template>
