<script setup lang="ts" generic="T extends { id: number }">
/**
 * Список с перетаскиванием. Заменяет числовое поле order, которое раньше
 * приходилось править руками в форме каждой записи — чтобы поменять две
 * местами, нужно было открыть обе и не сбиться в нумерации.
 *
 * Без библиотеки: HTML5 drag-and-drop покрывает нужное, а тянуть пакет
 * ради одного списка на семь строк смысла нет.
 */
const props = defineProps<{ items: T[], disabled?: boolean }>()
const emit  = defineEmits<{ reorder: [ids: number[]] }>()

const dragIndex = ref<number | null>(null)
const overIndex = ref<number | null>(null)

function move(from: number, to: number) {
  if (to < 0 || to >= props.items.length || from === to) return
  const ids = props.items.map((i) => i.id)
  const [moved] = ids.splice(from, 1)
  ids.splice(to, 0, moved as number)
  emit('reorder', ids)
}

function onDragStart(index: number, e: DragEvent) {
  dragIndex.value = index
  // Без dataTransfer Firefox не начинает перетаскивание вовсе.
  e.dataTransfer?.setData('text/plain', String(index))
  if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move'
}

function onDragOver(index: number, e: DragEvent) {
  if (dragIndex.value === null) return
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

/** Тем, кто не пользуется мышью, порядок доступен стрелками с Alt. */
function onKey(index: number, e: KeyboardEvent) {
  if (!e.altKey) return
  if (e.key === 'ArrowUp')   { e.preventDefault(); move(index, index - 1) }
  if (e.key === 'ArrowDown') { e.preventDefault(); move(index, index + 1) }
}
</script>

<template>
  <div class="sortable">
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
        v-if="!disabled"
        class="sortable__grip"
        type="button"
        draggable="true"
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

.sortable__body { flex: 1; min-width: 0; }
</style>
