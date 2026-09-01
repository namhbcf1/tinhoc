import { useState } from 'react';
import type { UploadStatusSnapshot } from '../../../../components/upload/CCCDUploader';
import {
  createIdleUploadSnapshot,
  type UploadSuccessResult,
  type StudentRegistrationUploadHookResult,
  UPLOAD_TYPE_LABELS,
} from './student-registration-types';

export function useStudentRegistrationUpload(): StudentRegistrationUploadHookResult {
  const [uploadRuntime, setUploadRuntime] = useState<Record<UploadSuccessResult['type'], UploadStatusSnapshot>>({
    cccd_front: createIdleUploadSnapshot('cccd_front'),
    cccd_back: createIdleUploadSnapshot('cccd_back'),
    photo_3x4: createIdleUploadSnapshot('photo_3x4'),
  });
  const [imageErrors, setImageErrors] = useState({
    cccd_front: '',
    cccd_back: '',
    photo_3x4: '',
  });
  const [imageIds, setImageIds] = useState({
    cccd_front: null,
    cccd_back: null,
    photo_3x4: null,
  });
  const [uploaderKeys] = useState({
    cccd_front: 0,
    cccd_back: 0,
    photo_3x4: 0,
  });

  const handleUploaderStatusChange = (nextState: UploadStatusSnapshot) => {
    setUploadRuntime((prev) => {
      const current = prev[nextState.type];
      if (
        current.status === nextState.status
        && current.progress === nextState.progress
        && current.stage === nextState.stage
        && current.message === nextState.message
      ) {
        return prev;
      }

      return {
        ...prev,
        [nextState.type]: nextState,
      };
    });
  };

  const processingItems = (['cccd_front', 'cccd_back', 'photo_3x4'] as const).flatMap((type) => {
    const runtime = uploadRuntime[type];
    if (runtime.status !== 'uploading') return [];

    const fallbackDescription = runtime.status === 'uploading'
      ? `Đang tải ${UPLOAD_TYPE_LABELS[type].toLowerCase()} lên hệ thống.`
      : type === 'photo_3x4'
        ? 'Hệ thống đang xử lý ảnh 3x4 bạn vừa tải lên.'
        : 'Hệ thống đang lưu ảnh CCCD bạn vừa tải lên.';

    return [{
      key: `upload-${type}`,
      title: UPLOAD_TYPE_LABELS[type],
      description: runtime.message || fallbackDescription,
      progress: Math.max(runtime.progress || (runtime.status === 'uploading' ? 18 : 12), 8),
    }];
  });

  const isProcessingUploads = processingItems.length > 0;

  const handleUploadSuccess = async (result: UploadSuccessResult) => {
    setImageIds((prev) => ({ ...prev, [result.type]: result.imageId }));
    setImageErrors((prev) => ({ ...prev, [result.type]: '' }));
  };

  const handleUploadError = (err: Error) => {
    console.error('Upload error:', err);
  };

  return {
    imageErrors,
    imageIds,
    uploaderKeys,
    processingItems,
    isProcessingUploads,
    handleUploaderStatusChange,
    handleUploadSuccess,
    handleUploadError,
    setImageErrors,
  };
}
