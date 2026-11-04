import React from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { assignInlineVars } from "@vanilla-extract/dynamic";
import { ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { IconButton, Tooltip } from "@chardb/ui";
import * as styles from "./SortableList.css";

export interface SortableListProps<T> {
  items: readonly T[];
  getId: (item: T) => string;
  /** Names the item in its controls: "Move Common up". */
  getName: (item: T) => string;
  /** The ids of every item, in their new order. */
  onReorder: (ids: string[]) => void;
  /** Without it the list shows no handles or move buttons. */
  editable: boolean;
  "aria-label": string;
  /** One row's content, beside its controls. */
  children: (item: T) => React.ReactNode;
}

/**
 * A list someone arranges by hand: drag a row by its handle, or tap its up
 * and down buttons. The handle also moves by keyboard (Space to lift, the
 * arrow keys, Space to drop).
 */
export function SortableList<T>({
  items,
  getId,
  getName,
  onReorder,
  editable,
  "aria-label": label,
  children,
}: SortableListProps<T>) {
  const ids = items.map(getId);
  const sensors = useSensors(
    // A few pixels of travel before a drag starts, so a tap on the handle is
    // not a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const move = (from: number, to: number) => {
    if (to < 0 || to >= ids.length || from === to) return;
    onReorder(arrayMove(ids, from, to));
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    move(ids.indexOf(String(active.id)), ids.indexOf(String(over.id)));
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className={styles.list} aria-label={label}>
          {items.map((item, index) => (
            <SortableRow
              key={ids[index]}
              id={ids[index]}
              name={getName(item)}
              editable={editable}
              first={index === 0}
              last={index === items.length - 1}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
            >
              {children(item)}
            </SortableRow>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  id: string;
  name: string;
  editable: boolean;
  first: boolean;
  last: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  children: React.ReactNode;
}

function SortableRow({
  id,
  name,
  editable,
  first,
  last,
  onMoveUp,
  onMoveDown,
  children,
}: SortableRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !editable });

  return (
    <li
      ref={setNodeRef}
      className={styles.row}
      data-dragging={isDragging ? "" : undefined}
      style={assignInlineVars({
        [styles.transform]: CSS.Transform.toString(transform) ?? "none",
        [styles.transition]: transition ?? "none",
      })}
    >
      {editable && (
        <button
          type="button"
          ref={setActivatorNodeRef}
          className={styles.handle}
          {...attributes}
          {...listeners}
          aria-label={`Drag to reorder ${name}`}
        >
          <GripVertical size={20} aria-hidden />
        </button>
      )}
      <div className={styles.content}>{children}</div>
      {editable && (
        <div className={styles.moves}>
          <Tooltip label="Move up">
            <IconButton
              label={`Move ${name} up`}
              icon={<ChevronUp size={18} aria-hidden />}
              disabled={first}
              onClick={onMoveUp}
            />
          </Tooltip>
          <Tooltip label="Move down">
            <IconButton
              label={`Move ${name} down`}
              icon={<ChevronDown size={18} aria-hidden />}
              disabled={last}
              onClick={onMoveDown}
            />
          </Tooltip>
        </div>
      )}
    </li>
  );
}
