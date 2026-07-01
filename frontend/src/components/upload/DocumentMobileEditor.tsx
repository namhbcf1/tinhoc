import { AlertCircle, Check, Loader2, Upload } from 'lucide-react';
import type { DocumentEditorViewProps } from './document-editor-view-types';

export default function DocumentMobileEditor({
  saving,
  manualError,
  canvasStage,
  onCancel,
  onConfirm,
}: DocumentEditorViewProps) {
  return (
    <div className="document-smart-manual-layout document-smart-manual-layout--mobile document-smart-manual-layout--simple">
      {canvasStage}

      <p className="document-smart-mobile-hint">
        Kéo ảnh bằng tay, chụm hai ngón để zoom và căn đúng trong khung.
      </p>

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
