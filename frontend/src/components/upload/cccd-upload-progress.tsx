interface UploadProgressBarProps {
    progress: number;
    label?: string;
    completionLabel?: string;
}

export default function UploadProgressBar({ progress, label, completionLabel }: UploadProgressBarProps) {
    return (
        <div className="upload-progress-wrapper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="upload-progress-track">
                <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="upload-progress-label">
                {progress < 100
                    ? (label || `Đang tải lên... ${progress}%`)
                    : (completionLabel || 'Hoàn thành!')}
            </span>
        </div>
    );
}
