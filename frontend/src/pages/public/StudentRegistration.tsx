import '../../styles/public/RegistrationFormA4.css';
import { useIsMobile } from '../../utils/deviceDetection';
import StudentRegistrationDesktopView from './register/desktop/StudentRegistrationDesktopView';
import StudentRegistrationMobileView from './register/mobile/StudentRegistrationMobileView';
import { useStudentRegistration } from './register/shared/useStudentRegistration';

export default function StudentRegistration() {
  const isMobile = useIsMobile();
  const viewProps = useStudentRegistration();

  return isMobile
    ? <StudentRegistrationMobileView {...viewProps} />
    : <StudentRegistrationDesktopView {...viewProps} />;
}
