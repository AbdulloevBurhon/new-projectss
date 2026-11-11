<script setup lang="ts">
defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{ title: string; description?: string; closeOnBackdrop?: boolean; busy?: boolean; dialogClass?: string | string[]; headerClass?: string; bodyClass?: string; closeButtonClass?: string }>(), { closeOnBackdrop: true, busy: false, dialogClass: '', headerClass: '', bodyClass: '', closeButtonClass: '' })
const open = defineModel<boolean>({ default: false })
const emit = defineEmits<{ close: [] }>()
const titleId = useId()
const descriptionId = useId()
const panel = useTemplateRef<HTMLDialogElement>('panel')
function close() {
  if (props.busy) return
  if (panel.value?.open) panel.value.close()
  else open.value = false
}
function onClose() {
  open.value = false
  emit('close')
}
function onCancel(event: Event) { if (props.busy) event.preventDefault() }
watch(open, async value => {
  await nextTick()
  if (!panel.value) return
  if (value && !panel.value.open) panel.value.showModal()
  if (!value && panel.value.open) panel.value.close()
}, { immediate: true, flush: 'post' })
</script>

<template>
  <Teleport to="body">
    <dialog ref="panel" v-bind="$attrs" class="shared-modal" :class="dialogClass" :aria-labelledby="titleId" :aria-describedby="description ? descriptionId : undefined" @close="onClose" @cancel="onCancel" @click.self="closeOnBackdrop && close()">
      <header class="shared-modal-header" :class="headerClass">
        <div>
          <h2 :id="titleId">{{ title }}</h2>
          <p v-if="description" :id="descriptionId">{{ description }}</p>
        </div>
        <button type="button" :class="['shared-modal-close', closeButtonClass]" aria-label="Закрыть" :disabled="busy" @click="close"><slot name="close">×</slot></button>
      </header>
      <div class="shared-modal-content" :class="bodyClass"><slot /></div>
      <footer v-if="$slots.footer" class="shared-modal-footer"><slot name="footer" :close="close" /></footer>
    </dialog>
  </Teleport>
</template>

<style scoped>
.shared-modal { width: min(100%, 560px); max-height: min(90dvh, 850px); overflow: auto; border: 1px solid #dce4ee; border-radius: 15px; padding: 0; background: #fff; color: #142238; box-shadow: 0 22px 70px #09152940; }
.shared-modal::backdrop { background: #101b3280; }
.shared-modal.inventory-dialog { width: 440px; max-width: calc(100% - 36px); border-color: var(--line); border-radius: 13px; color: var(--ink); box-shadow: 0 18px 70px #09152940; }
.shared-modal.inventory-dialog.is-wide { width: 760px; max-height: calc(100dvh - 36px); }
.shared-modal-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; padding: 18px 20px; border-bottom: 1px solid #e4eaf1; }
.shared-modal-header h2 { margin: 0; font-size: 18px; font-weight: 700; }
.shared-modal-header p { margin: 6px 0 0; color: #687991; font-size: 13px; }
.shared-modal-close { display: grid; place-items: center; width: 32px; height: 32px; flex: none; border: 1px solid #dce4ee; border-radius: 8px; background: #fff; color: #52657c; font-size: 22px; cursor: pointer; }
.shared-modal-close:disabled { opacity: .55; cursor: not-allowed; }
.shared-modal-content { padding: 20px; }
.shared-modal-content.workshop-modal-body { padding: 0; }
.shared-modal-header.dialog-heading { align-items: center; gap: 12px; padding: 14px 19px; border-color: var(--line); }
.shared-modal-header.dialog-heading h2 { font-size: 16px; }
.shared-modal-header.dialog-heading p { display: none; }
.shared-modal-close.icon-button { width: 32px; height: 32px; border-color: transparent; font-size: 16px; }
.shared-modal-footer { display: flex; justify-content: flex-end; gap: 9px; padding: 14px 20px; border-top: 1px solid #e4eaf1; }
</style>
