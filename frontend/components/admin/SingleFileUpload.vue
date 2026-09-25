<script setup lang="ts">
import type { IAttachment } from '~/types/attachment'

const props = withDefaults(defineProps<{
    modelValue: IAttachment | null
    disabled?: boolean
    accept?: string
    maxSize?: number
    deferred?: boolean
    previewOnly?: boolean
}>(), {
    disabled: false,
    accept: '',
    maxSize: 10 * 1024 * 1024,
    deferred: false,
    previewOnly: false,
})
const emit = defineEmits<{
    'update:modelValue': [value: IAttachment | null]
    'busy': [value: boolean]
}>()
const { t } = useI18n()
const input = ref<HTMLInputElement>()
const busy = ref(false)
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref(false)
const error = ref('')
const dragDepth = ref(0)
const dragging = computed(() => dragDepth.value > 0 && !props.disabled && !busy.value)
const uploading = ref(false)
const uploaded = new Map<string, IAttachment>()
const removed = new Map<string, IAttachment>()
let previewRequest = 0
let disposed = false

function setBusy(value: boolean) {
    busy.value = value
    emit('busy', value)
}

function accepts(file: File) {
    return !props.accept || props.accept.split(',').some(value => {
        const rule = value.trim().toLowerCase()
        if (rule.startsWith('.')) return file.name.toLowerCase().endsWith(rule)
        if (rule.endsWith('/*')) return file.type.toLowerCase().startsWith(rule.slice(0, -1))
        return file.type.toLowerCase() === rule
    })
}

async function loadPreview() {
    const request = ++previewRequest
    previewUrl.value = ''
    previewError.value = false
    previewLoading.value = false
    const attachment = props.modelValue
    if (!attachment) return
    previewLoading.value = true
    try {
        const response = await useApi<{ payload: { url: string } }>('minio/presigned-url', {
            params: { name: attachment.objectName },
        })
        if (!disposed && request === previewRequest) previewUrl.value = response.payload.url
    } catch {
        if (!disposed && request === previewRequest) previewError.value = true
    } finally {
        if (!disposed && request === previewRequest) previewLoading.value = false
    }
}

async function deleteAttachment(attachment: IAttachment) {
    await useApi('minio/file', { method: 'delete', params: { name: attachment.objectName } })
}

// Deferred mode keeps existing files until the parent saves its record.
async function commit(): Promise<boolean> {
    setBusy(true)
    error.value = ''
    try {
        for (const attachment of removed.values()) {
            if (attachment.objectName !== props.modelValue?.objectName) await deleteAttachment(attachment)
            removed.delete(attachment.objectName)
            uploaded.delete(attachment.objectName)
        }
        uploaded.clear()
        return true
    } catch {
        error.value = t('upload.cleanup_error')
        return false
    } finally {
        setBusy(false)
    }
}

async function discard(): Promise<boolean> {
    setBusy(true)
    error.value = ''
    try {
        for (const attachment of uploaded.values()) {
            await deleteAttachment(attachment)
            uploaded.delete(attachment.objectName)
        }
        removed.clear()
        return true
    } catch {
        error.value = t('upload.cleanup_error')
        return false
    } finally {
        setBusy(false)
    }
}

async function chooseFile(event: Event) {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    await uploadFile(file)
}

async function uploadFile(file?: File) {
    if (!file || busy.value || props.disabled || props.previewOnly) return
    error.value = ''
    if (file.size > props.maxSize) {
        error.value = t('upload.size_error', { size: props.maxSize / 1024 / 1024 })
        return
    }
    if (!accepts(file)) {
        error.value = t('upload.type_error')
        return
    }
    setBusy(true)
    uploading.value = true
    try {
        const body = new FormData()
        body.append('file', file)
        const response = await useApi<{ payload: IAttachment }>('minio/upload', { method: 'post', body })
        const attachment = response.payload
        uploaded.set(attachment.objectName, attachment)
        if (props.modelValue) removed.set(props.modelValue.objectName, props.modelValue)
        emit('update:modelValue', attachment)
        await nextTick()
        if (!props.deferred) await commit()
    } catch {
        error.value = t('upload.upload_error')
    } finally {
        uploading.value = false
        setBusy(false)
    }
}

function dragEnter(event: DragEvent) {
    if (props.disabled || busy.value || props.previewOnly || !event.dataTransfer?.types.includes('Files')) return
    dragDepth.value++
}

function dragOver(event: DragEvent) {
    if (event.dataTransfer) event.dataTransfer.dropEffect = props.disabled || busy.value ? 'none' : 'copy'
}

async function dropFiles(event: DragEvent) {
    dragDepth.value = 0
    if (props.disabled || busy.value || props.previewOnly) return
    const files = event.dataTransfer?.files
    if (!files?.length) return
    if (files.length > 1) {
        error.value = t('upload.single_file')
        return
    }
    await uploadFile(files[0])
}

function formatSize(bytes: number) {
    return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.ceil(bytes / 1024))} KB`
}

async function removeFile() {
    if (!props.modelValue || props.disabled || busy.value || props.previewOnly) return
    error.value = ''
    const attachment = props.modelValue
    setBusy(true)
    try {
        if (props.deferred) removed.set(attachment.objectName, attachment)
        else {
            await deleteAttachment(attachment)
            uploaded.delete(attachment.objectName)
            removed.delete(attachment.objectName)
        }
        emit('update:modelValue', null)
    } catch {
        error.value = t('upload.delete_error')
    } finally {
        setBusy(false)
    }
}

onMounted(() => {
    watch(() => props.modelValue?.objectName, loadPreview, { immediate: true })
})
onBeforeUnmount(() => { disposed = true; previewRequest++ })
defineExpose({ commit, discard })
</script>

<template>
    <div v-if="previewOnly">
        <div v-if="modelValue" class="flex items-center gap-2">
            <div v-loading="previewLoading" class="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50">
                <el-image
                    v-if="previewUrl && modelValue.mimetype.startsWith('image/') && !previewError"
                    :src="previewUrl"
                    :alt="modelValue.originalName"
                    :preview-src-list="[previewUrl]"
                    preview-teleported
                    fit="cover"
                    class="h-full w-full"
                    @error="previewError = true"
                />
                <Icon v-else name="hugeicons:file-01" :size="24" class="text-slate-400"/>
            </div>
            <el-button v-if="previewError" link type="primary" :aria-label="t('upload.retry_preview')" @click="loadPreview">{{ t('upload.retry') }}</el-button>
        </div>
        <span v-else class="text-slate-400">—</span>
    </div>
    <div v-else class="w-full">
        <div
            class="relative overflow-hidden rounded-2xl border transition-colors duration-200 motion-reduce:transition-none"
            :class="[
                dragging ? 'border-teal-500 bg-teal-50 ring-4 ring-teal-500/10' : error ? 'border-red-200 bg-white' : 'border-slate-200 bg-white',
                { 'opacity-60': disabled },
            ]"
            :aria-busy="busy"
            @dragenter.prevent="dragEnter"
            @dragover.prevent="dragOver"
            @dragleave.prevent="dragDepth = Math.max(0, dragDepth - 1)"
            @drop.prevent="dropFiles"
        >
            <input
                ref="input"
                type="file"
                :accept="accept"
                :disabled="disabled || busy"
                class="hidden"
                @change="chooseFile"
            >
            <div v-if="modelValue" class="p-4">
                <div v-loading="previewLoading" class="flex h-44 items-center justify-center overflow-hidden rounded-xl bg-slate-50 sm:h-52">
                    <el-image
                        v-if="previewUrl && modelValue.mimetype.startsWith('image/') && !previewError"
                        :src="previewUrl"
                        :alt="modelValue.originalName"
                        :preview-src-list="[previewUrl]"
                        preview-teleported
                        fit="contain"
                        class="h-full w-full"
                        @error="previewError = true"
                    />
                    <div v-else class="flex flex-col items-center gap-3 text-slate-400">
                        <Icon name="hugeicons:file-01" :size="36"/>
                        <el-button v-if="previewError" link type="primary" @click="loadPreview">{{ t('upload.retry_preview') }}</el-button>
                    </div>
                </div>
                <div class="mt-4 flex items-center gap-3">
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <Icon name="hugeicons:file-01" :size="20"/>
                    </span>
                    <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-slate-700" :title="modelValue.originalName">{{ modelValue.originalName }}</p>
                        <p class="mt-0.5 text-xs text-slate-400">{{ formatSize(modelValue.size) }}</p>
                    </div>
                    <a v-if="previewUrl" :href="previewUrl" target="_blank" rel="noopener noreferrer" :aria-label="t('upload.open')" :title="t('upload.open')" class="rounded-lg p-2 text-slate-400 hover:bg-slate-50 hover:text-teal-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-600">
                        <Icon name="hugeicons:link-square-01" :size="20"/>
                    </a>
                    <button type="button" :disabled="disabled || busy" :aria-label="t('upload.remove')" :title="t('upload.remove')" class="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500 disabled:cursor-not-allowed" @click="removeFile">
                        <Icon name="hugeicons:delete-02" :size="20"/>
                    </button>
                </div>
            </div>
            <button
                type="button"
                :disabled="disabled || busy"
                class="group flex w-full flex-col items-center justify-center gap-3 text-center transition-colors hover:bg-teal-50/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-teal-600 disabled:cursor-not-allowed"
                :class="modelValue ? 'border-t border-dashed border-slate-200 px-4 py-4' : 'min-h-[210px] px-5 py-8'"
                @click="input?.click()"
            >
                <span v-if="!modelValue" class="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-100 bg-white text-teal-600 shadow-sm transition-transform group-hover:-translate-y-0.5 motion-reduce:transform-none">
                    <Icon name="hugeicons:cloud-upload" :size="28"/>
                </span>
                <span class="text-sm font-medium text-slate-600">
                    <span class="text-teal-700">{{ modelValue ? t('upload.replace') : t('upload.browse') }}</span>
                    <span class="ml-1">{{ t('upload.drop_hint') }}</span>
                </span>
                <span class="text-xs text-slate-400">{{ t('upload.limit', { size: maxSize / 1024 / 1024 }) }}</span>
            </button>
            <div v-if="dragging" class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-teal-500 bg-teal-50/95 text-teal-700">
                <Icon name="hugeicons:cloud-upload" :size="36"/>
                <span class="text-sm font-semibold">{{ t('upload.drop_now') }}</span>
            </div>
            <div v-if="busy" role="status" class="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-white/90">
                <Icon name="eos-icons:loading" :size="28" class="text-teal-600"/>
                <span class="text-sm font-medium text-slate-600">{{ uploading ? t('upload.uploading') : t('upload.processing') }}</span>
            </div>
        </div>
        <p v-if="error" role="alert" class="mt-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
            <Icon name="hugeicons:alert-circle" :size="16" class="shrink-0"/>
            {{ error }}
        </p>
    </div>
</template>
