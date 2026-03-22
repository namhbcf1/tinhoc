import { useEffect } from 'react';

type ExternalRedirectProps = {
  to: string;
};

export default function ExternalRedirect({ to }: ExternalRedirectProps) {
  useEffect(() => {
    window.location.replace(to);
  }, [to]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin mx-auto mb-3" />
        <p className="text-slate-500 text-sm font-medium">Đang chuyển đến VanTrangExam...</p>
      </div>
    </div>
  );
}
