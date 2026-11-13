<script setup lang="ts">
import { Eye, EyeOff, Save } from '@lucide/vue'
import { ref } from 'vue'
import { Button } from '../../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card'
import { Input } from '../../ui/input'
import { Label } from '../../ui/label'

const props = withDefaults(defineProps<{ productName: string; pinLength?: number }>(), { pinLength: 5 })
const emit = defineEmits<{ save: [pin: string] }>()
const pin = ref('')
const visible = ref(false)

function savePin() {
  if (pin.value.length !== props.pinLength) return
  emit('save', pin.value)
  pin.value = ''
}
</script>

<template>
  <Card class="h-full min-h-[260px] gap-3 py-4">
    <CardHeader class="px-5"><CardTitle>PIN-код</CardTitle><CardDescription>Задайте новый код для входа в {{ productName }}.</CardDescription></CardHeader>
    <CardContent class="space-y-3 px-5">
      <Label for="settings-pin">Новый PIN-код</Label>
      <div class="flex gap-2">
        <div class="relative min-w-0 flex-1"><Input id="settings-pin" v-model="pin" :type="visible ? 'text' : 'password'" inputmode="numeric" :maxlength="pinLength" placeholder="Введите PIN-код" class="pr-10" /><button type="button" class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" :aria-label="visible ? 'Скрыть PIN' : 'Показать PIN'" @click="visible = !visible"><EyeOff v-if="visible" :size="17" /><Eye v-else :size="17" /></button></div>
        <Button aria-label="Сохранить PIN-код" :disabled="pin.length !== pinLength" @click="savePin"><Save :size="16" /></Button>
      </div>
    </CardContent>
  </Card>
</template>
