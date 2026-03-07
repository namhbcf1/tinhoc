import { useIsMobile } from '../../utils/deviceDetection';
import TeacherDashboardDesktop from './desktop/TeacherDashboardDesktop';
import TeacherDashboardMobile from './mobile/TeacherDashboardMobile';

export default function TeacherDashboard() {
  const isMobile = useIsMobile();
  
  return isMobile ? <TeacherDashboardMobile /> : <TeacherDashboardDesktop />;
}
