import type { ReactNode } from 'react';

export interface DocumentEditorViewProps {
  scale: number;
  rotation: number;
  saving: boolean;
  manualError: string;
  canvasStage: ReactNode;
  onSetZoom: (value: number) => void;
  onZoomDelta: (delta: number) => void;
  onRotateFine: (delta: number) => void;
  onRotateLeft: () => void;
  onRotateRight: () => void;
  onReset: () => void;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
}
