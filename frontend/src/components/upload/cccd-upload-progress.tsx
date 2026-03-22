interface UploadProgressBarProps {
    progress: number;
}

export default function UploadProgressBar({ progress }: UploadProgressBarProps) {
    return (
        <div className="upload-progress-wrapper" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="upload-progress-track">
                <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="upload-progress-label">{progress < 100 ? `Đang tải lên... ${progress}%` : 'Hoàn thành!'}</span>
        </div>
    );
}
