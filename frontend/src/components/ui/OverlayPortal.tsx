import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useOverlayLayer, useOverlayLock } from './overlay-lock';

export default function OverlayPortal({ children, active = true }: { children: ReactNode; active?: boolean }) {
  useOverlayLock(active);
  const overlayLayer = useOverlayLayer(active);

  if (!active) return null;

  const portalTree = (
    <div className="fixed inset-0" style={{ zIndex: overlayLayer }}>
      {children}
    </div>
  );

  if (typeof document === 'undefined') {
    return portalTree;
  }

  return createPortal(portalTree, document.body);
}
