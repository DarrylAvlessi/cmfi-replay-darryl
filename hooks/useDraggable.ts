import { useState, useRef, useCallback } from 'react';

export function useDraggable() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const hasDraggedRef = useRef(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    elWidth: number;
    elHeight: number;
    captured: boolean;
  } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    if (target.closest('[role="slider"]')) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const currentLeft = position?.x ?? rect.left;
    const currentTop = position?.y ?? rect.top;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: currentLeft,
      originY: currentTop,
      elWidth: rect.width,
      elHeight: rect.height,
      captured: false,
    };
    hasDraggedRef.current = false;
    setPosition({ x: currentLeft, y: currentTop });
    setIsDragging(true);
  }, [position]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      hasDraggedRef.current = true;
      if (dragRef.current && !dragRef.current.captured) {
        dragRef.current.captured = true;
        e.currentTarget.setPointerCapture(e.pointerId);
      }
    }

    const newX = dragRef.current.originX + deltaX;
    const newY = dragRef.current.originY + deltaY;

    const clampedX = Math.max(0, Math.min(newX, window.innerWidth - dragRef.current.elWidth));
    const clampedY = Math.max(0, Math.min(newY, window.innerHeight - dragRef.current.elHeight));

    setPosition({ x: clampedX, y: clampedY });
  }, []);

  const handlePointerUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
  }, []);

  return { position, isDragging, handlePointerDown, handlePointerMove, handlePointerUp, hasDraggedRef };
}
