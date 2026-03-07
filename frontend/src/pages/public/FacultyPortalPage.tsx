import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModernPublicLayout from '../../components/layout/ModernPublicLayout';
import { Loader2 } from 'lucide-react';

export default function FacultyPortalPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login?tab=teacher');
    }, 1000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <ModernPublicLayout>
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="h-10 w-10 text-green-600 animate-spin mb-4" />
        <h2 className="text-2xl font-bold text-slate-800">Đang chuyển hướng đến Cổng cán bộ giảng viên...</h2>
        <p className="text-slate-500 mt-2">Vui lòng chờ trong giây lát.</p>
      </div>
    </ModernPublicLayout>
  );
}






