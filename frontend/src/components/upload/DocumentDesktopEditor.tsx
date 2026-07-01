import { AlertCircle, Check, Loader2, Upload } from 'lucide-react';
import type { DocumentEditorViewProps } from './document-editor-view-types';

export default function DocumentDesktopEditor({
  saving,
  manualError,
  canvasStage,
  onCancel,
  onConfirm,
}: DocumentEditorViewProps) {
  return (
    <div className="document-smart-manual-layout document-smart-manual-layout--desktop document-smart-manual-layout--simple">
      <div className="document-smart-desktop-stage-panel">
        <div className="document-smart-desktop-stage-head">
          <div>
            <span className="document-smart-mode-chip">Căn ảnh thủ công</span>
            <h4>Căn CCCD</h4>
          </div>
        </div>

        {canvasStage}

        <p className="document-smart-desktop-hint">
          Kéo ảnh để di chuyển, dùng con lăn chuột hoặc chạm tay để zoom và căn đúng trong khung.
        </p>
      </div>

      {manualError ? (
        <div className="document-smart-inline-error">
          <AlertCircle size={16} />
          <span>{manualError}</span>
        </div>
      ) : null}

      <div className="document-smart-manual-actions document-smart-manual-actions--simple">
        <button type="button" className="document-smart-ghost-btn" onClick={onCancel}>
          <Upload size={16} />
          <span>Ảnh khác</span>
        </button>
        <button type="button" className="document-smart-primary-btn" onClick={() => { void onConfirm(); }} disabled={saving}>
          {saving ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
          <span>Xác nhận ảnh CCCD</span>
        </button>
      </div>
    </div>
  );
}
