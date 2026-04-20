# Photo 3x4 AI Upgrade

Date: 2026-04-06

## Goal

- Keep AI enhancement enabled for `photo_3x4`.
- Prevent upload failures from blocking students when the AI pipeline is slow or a model step fails.

## Current behavior

- Upload still returns immediately with a processing log for `photo_3x4`.
- Frontend polls the processing status and only commits the final selected image once the pipeline completes.
- The pipeline can now finish in three safe modes:
  - `ai_generate`: AI-generated final portrait passed validation.
  - `transform_fallback`: deterministic crop/background optimization is used when AI generation or validation is not good enough.
  - `original_fallback`: the original uploaded image is kept if the pipeline cannot safely continue.

## Safety guarantees

- The backend no longer treats every AI problem as a hard upload failure.
- If AI is disabled, unsupported, times out, or produces a weak result, the pipeline completes with the safest available image instead of leaving the student stuck in an error state.
- Warnings are preserved in `warnings_json` so the UI can still explain what happened.

## Main files

- `backend/src/routes/cccd-upload.ts`
- `backend/src/services/photo-3x4-pipeline.ts`
- `frontend/src/components/upload/CCCDUploader.tsx`
- `frontend/src/components/upload/ImageEditor.tsx`
- `frontend/src/components/upload/ImageEditorMobile.tsx`
- `frontend/e2e/register-birth-place.spec.ts`
