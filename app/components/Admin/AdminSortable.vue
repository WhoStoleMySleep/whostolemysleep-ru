<script setup lang="ts" generic="T extends { id: number }">
/**
 * A drag-and-drop list. It replaces the numeric order field that used to be
 * edited by hand in every entry's form — swapping two entries meant opening both
 * and keeping the numbering straight.
 *
 * No library: HTML5 drag-and-drop covers what is needed, and pulling in a package
 * for one seven-row list is not worth it.
 */
const props = defineProps<{ items: T[], disabled?: boolean; canReorder?: (item: T) => boolean; reserveHandle?: boolean }>()
const emit  = defineEmits<{ reorder: [ids: number[]] }>()

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)
const root = ref<HTMLElement | null>(null)
const focusAfterMove = ref<number | null>(null)

watch([() => props.disabled, () => props.items], async () => {
  if (focusAfterMove.value === null) return
  const index = props.items.findIndex(item => item.id === focusAfterMove.value)
  if (!reorderable(index)) { focusAfterMove.value = null; return }
  if (props.disabled) return
  await nextTick()
  root.value?.querySelector<HTMLButtonElement>(`[data-sortable-id="${focusAfterMove.value}"]`)?.focus()
  focusAfterMove.value = null
})

function reorderable(index: number) {
  const item = props.items[index]
  return !!item && (props.canReorder?.(item) ?? true)
}

function movable(index: number) {
  return !props.disabled && reorderable(index)
}

function move(from: number, to: number) {
  if (from === to || !movable(from) || !movable(to)) return
  const ids = props.items.map((i) => i.id)
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved as number)
  emit('reorder', ids)
}

function onDragStart(index: number, e: DragEvent) {
  if (!movable(index)) return
  dragIndex.value = index
  // Without dataTransfer Firefox does not start the drag at all.
  e.dataTransfer?.setData('text/plain', String(index))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  if (dragIndex.value === null || !movable(index)) return
  e.preventDefault()
  overIndex.value = index
}

function onDrop(index: number) {
  if (dragIndex.value !== null) move(dragIndex.value, index)
  dragIndex.value = null
  overIndex.value = null
}

function onDragEnd() {
  dragIndex.value = null
  overIndex.value = null
}

/** For anyone not using a mouse, the order is reachable with Alt and the arrow keys. */
function onKey(index: number, e: KeyboardEvent) {
  const direction = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!e.altKey || !direction) return
  e.preventDefault()
  if (!movable(index) || !movable(index + direction)) return
  focusAfterMove.value = props.items[index]!.id
  move(index, index + direction)
}
</script>

<template>
  <div ref="root" class="sortable">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      class="sortable__row"
      :class="{
        'sortable__row--dragging': dragIndex === index,
        'sortable__row--over': overIndex === index && dragIndex !== index,
      }"
      @dragover="onDragOver(index, $event)"
      @drop.prevent="onDrop(index)"
    >
      <button
        v-if="reorderable(index)"
        class="sortable__grip"
        :data-sortable-id="item.id"
        type="button"
        :draggable="!disabled"
        :aria-disabled="disabled"
        :aria-label="`Reorder, position ${index + 1} of ${items.length}. Alt with arrow keys to move.`"
        @dragstart="onDragStart(index, $event)"
        @dragend="onDragEnd"
        @keydown="onKey(index, $event)"
      >
        <svg width="10" height="14" viewBox="0 0 10 14" aria-hidden="true">
          <circle v-for="p in [[3,3],[7,3],[3,7],[7,7],[3,11],[7,11]]" :key="`${p[0]}-${p[1]}`"
                  :cx="p[0]" :cy="p[1]" r="1.2" fill="currentColor" />
        </svg>
      </button>

      <span v-else-if="reserveHandle" class="sortable__spacer" aria-hidden="true" />
      <div class="sortable__body">
        <slot :item="item" :index="index" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.sortable { display: flex; flex-direction: column; }

.sortable__row {
  display: flex;
  align-items: stretch;
  gap: 4px;
  border: 1px solid var(--border);
  border-radius: var(--r-s);
  background: var(--bg-1);
  margin-bottom: 8px;
  transition: border-color 0.15s, opacity 0.15s;
}

.sortable__row--dragging { opacity: 0.4; }
.sortable__row--over     { border-color: var(--accent); }

.sortable__spacer { width: 28px; flex-shrink: 0; }

.sortable__grip {
  flex-shrink: 0;
  display: grid;
  place-content: center;
  width: 28px;
  color: var(--text-4);
  background: none;
  border: none;
  border-right: 1px solid var(--border);
  cursor: grab;
}

.sortable__grip:hover { color: var(--text-2); }
.sortable__grip:active { cursor: grabbing; }
.sortable__grip[aria-disabled="true"] { opacity: 0.4; cursor: wait; }

.sortable__body { flex: 1; min-width: 0; }
</style>
