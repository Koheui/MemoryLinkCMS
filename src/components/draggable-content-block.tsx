'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { Block } from '@/types';

interface DraggableContentBlockProps {
  block: Block;
  children: React.ReactNode;
}

export function DraggableContentBlock({
  block,
  children,
}: DraggableContentBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative ${isDragging ? 'z-50' : ''}`}
    >
      {/* ドラッグハンドル */}
      <div
        {...attributes}
        {...listeners}
        className="absolute left-2 top-4 z-10 cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors"
      >
        <GripVertical className="w-4 h-4 text-gray-400" />
      </div>
      
      {/* ブロックコンテンツ */}
      <div className="pl-10">
        {children}
      </div>
    </div>
  );
}
