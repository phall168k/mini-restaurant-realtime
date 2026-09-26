<script setup lang="ts">
import { Dish } from '@element-plus/icons-vue'
import type { IAttachment } from '~/types/attachment'

const props = defineProps<{ attachment?: IAttachment | null; alt: string }>()
const url = ref('')
const failed = ref(false)
let request = 0

async function load() {
  const current = ++request
  url.value = ''
  failed.value = false
  const attachment = props.attachment
  if (!attachment?.mimetype.startsWith('image/')) return
  try {
    const response = await useApi<{ payload: { url: string } }>(
      'minio/presigned-url',
      {
        params: { name: attachment.objectName },
      },
    )
    if (current === request) url.value = response.payload.url
  } catch {
    if (current === request) failed.value = true
  }
}
onMounted(() => {
  watch(
    () => [
      props.attachment?.bucket,
      props.attachment?.objectName,
      props.attachment?.mimetype,
    ],
    load,
    { immediate: true },
  )
})
onBeforeUnmount(() => {
  request++
})
</script>

<template>
  <span class="flex h-full w-full items-center justify-center overflow-hidden">
    <img
      v-if="url && !failed"
      :src="url"
      :alt="alt"
      loading="lazy"
      decoding="async"
      class="h-full w-full object-cover"
      @error="failed = true"
    />
    <el-icon v-else :size="32" aria-hidden="true"><Dish /></el-icon>
  </span>
</template>
