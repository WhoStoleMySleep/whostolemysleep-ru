<script setup lang="ts">
/**
 * A form field: label, control and hint in one place.
 * Every page used to lay out label + input by hand with its own set of classes,
 * and the spacing did not match from page to page.
 */
const props = withDefaults(defineProps<{
  label?: string
  type?: 'text' | 'date' | 'url' | 'email' | 'number' | 'password' | 'textarea' | 'checkbox'
  hint?: string
  placeholder?: string
  rows?: number
  required?: boolean
  disabled?: boolean
}>(), { type: 'text', rows: 4 })

const model = defineModel<string | number | boolean | null>()

const id = useId()

/** An empty date field means "no date", not an empty column value. */
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  model.value = props.type === 'checkbox'
    ? el.checked
    : props.type === 'number' ? Number(el.value) : el.value
}
</script>

<template>
  <div class="field" :class="{ 'field--inline': type === 'checkbox' }">
    <label v-if="label && type !== 'checkbox'" class="field__label" :for="id">
      {{ label }}<span v-if="required" class="field__req">*</span>
    </label>

    <slot>
      <textarea
        v-if="type === 'textarea'"
        :id="id"
        class="admin-input field__control field__control--area"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="model as string"
        @input="onInput"
      />
      <input
        v-else-if="type === 'checkbox'"
        :id="id"
        type="checkbox"
        class="field__check"
        :disabled="disabled"
        :checked="model as boolean"
        @change="onInput"
      >
      <input
        v-else
        :id="id"
        class="admin-input field__control"
        :type="type"
        :placeholder="placeholder"
        :disabled="disabled"
        :value="model as string"
        @input="onInput"
      >
    </slot>

    <label v-if="label && type === 'checkbox'" class="field__label field__label--inline" :for="id">
      {{ label }}
    </label>

    <p v-if="hint" class="field__hint">{{ hint }}</p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; }

.field--inline {
  flex-direction: row;
  align-items: center;
  gap: 10px;
}

.field__label {
  font-size: 10px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--text-4);
}

.field__label--inline { text-transform: none; letter-spacing: 0.04em; font-size: 12px; color: var(--text-3); }

.field__req { color: var(--accent); margin-left: 3px; }

.field__control {
  width: 100%;
  padding: 10px 12px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  transition: border-color 0.15s;
}

.field__control--area { resize: vertical; line-height: 1.6; }

.field__control:disabled { opacity: 0.5; }

.field__check { width: 15px; height: 15px; accent-color: var(--accent); cursor: pointer; }

.field__hint { font-size: 10.5px; color: var(--text-4); line-height: 1.5; }
</style>
