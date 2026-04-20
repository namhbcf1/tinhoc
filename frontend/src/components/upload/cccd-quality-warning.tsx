import { AlertCircle, RefreshCw } from 'lucide-react';

interface QualityWarningProps {
  warnings: string[];
  onDismiss: () => void;
  onRetry: () => void;
}

export default function QualityWarning({ warnings, onDismiss, onRetry }: QualityWarningProps) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div className="quality-warning-banner" role="alert">
      <div className="quality-warning-icon"><AlertCircle size={18} /></div>
      <div className="quality-warning-body">
        <strong>Ảnh có thể chưa đạt yêu cầu:</strong>
        <ul>
          {warnings.map((warning, index) => <li key={index}>{warning}</li>)}
        </ul>
      </div>
      <div className="quality-warning-actions">
        <button type="button" className="btn-quality-retry" onClick={onRetry}>
          <RefreshCw size={14} /> Chụp lại
        </button>
        <button type="button" className="btn-quality-dismiss" onClick={onDismiss}>
          Vẫn dùng ảnh này
        </button>
      </div>
    </div>
  );
}
