import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, lazy, Suspense } from 'react';
import analytics from './utils/analytics';
import useAnalytics from './hooks/useAnalytics';
import LoadingSpinner from './components/ui/LoadingSpinner';
import ExternalRedirect from './components/routing/ExternalRedirect';
import ProductTour from './components/tour/ProductTour';
import { STUDY_PLATFORM_URL, openStudyPlatform } from './features/student/student-nav';

// Public pages — lazy-loaded for code splitting (reduces main bundle ~2.7MB → ~200KB)
const HomePage = lazy(() => import('./pages/public/HomePage'));
const StudentRegistration = lazy(() => import('./pages/public/StudentRegistration'));
const UnifiedLogin = lazy(() => import('./pages/public/UnifiedLogin'));
const AboutPage = lazy(() => import('./pages/public/AboutPage'));
const TrainingPage = lazy(() => import('./pages/public/TrainingPage'));
const AdmissionsPage = lazy(() => import('./pages/public/AdmissionsPage'));
const ResearchPage = lazy(() => import('./pages/public/ResearchPage'));
const ConnectionsPage = lazy(() => import('./pages/public/ConnectionsPage'));
const Hub4Page = lazy(() => import('./pages/public/Hub4Page'));
const LifePage = lazy(() => import('./pages/public/LifePage'));
const UnitsPage = lazy(() => import('./pages/public/UnitsPage'));
const StudentPortalPage = lazy(() => import('./pages/public/StudentPortalPage'));
const FacultyPortalPage = lazy(() => import('./pages/public/FacultyPortalPage'));
const CertificateLookup = lazy(() => import('./pages/public/CertificateLookup'));
const StudentLookup = lazy(() => import('./pages/public/StudentLookup'));
const ServicesPage = lazy(() => import('./pages/public/ServicesPage'));
const NewsPage = lazy(() => import('./pages/public/NewsPage'));
const PostDetailPage = lazy(() => import('./pages/public/PostDetailPage'));
const ContactPage = lazy(() => import('./pages/public/ContactPage'));
const PrivacyPage = lazy(() => import('./pages/public/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/public/TermsPage'));
const SemanticLanding = lazy(() => import('./pages/public/SemanticLanding'));
// Admin auth pages — lazy-loaded
const AdminLogin = lazy(() => import('./pages/admin/auth/AdminLogin'));
const PasswordResetPage = lazy(() => import('./pages/admin/auth/PasswordResetPage'));
// Legacy Exam Imports
// import ExamHomePage from './pages/exam/ExamHomePage';
// import ExamListPage from './pages/exam/ExamListPage';
// import ExamTestPage from './pages/exam/ExamTestPage';
// import ExamResultPage from './pages/exam/ExamResultPage';
// import ExamHistoryPage from './pages/exam/ExamHistoryPage';
// VSTEP Admin — lazy-loaded
// Authenticated dashboards — lazy-loaded
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));

function StudyPlatformRedirect() {
  useEffect(() => {
    void openStudyPlatform();
  }, []);

  return <ExternalRedirect to={STUDY_PLATFORM_URL} />;
}

function AppRoutes() {
  // Initialize analytics tracking
  useAnalytics();

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<StudentRegistration />} />
      <Route path="/login" element={<UnifiedLogin />} />
      <Route path="/dashboard" element={<StudentDashboard />} />
      <Route path="/dashboard/my-classes" element={<StudyPlatformRedirect />} />
      <Route path="/dashboard/register-class" element={<StudyPlatformRedirect />} />
      <Route path="/dashboard/payment" element={<Navigate to="/dashboard/exams" replace />} />
      <Route path="/dashboard/schedule" element={<Navigate to="/dashboard/exams" replace />} />
      <Route path="/dashboard/exams" element={<StudentDashboard />} />
      <Route path="/dashboard/profile" element={<StudentDashboard />} />
      <Route path="/dashboard/online-classes" element={<StudyPlatformRedirect />} />

      {/* Main pages */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/about/overview" element={<AboutPage />} />
      <Route path="/about/vision" element={<AboutPage />} />
      <Route path="/about/organization" element={<AboutPage />} />
      <Route path="/about/facilities" element={<AboutPage />} />
      <Route path="/about/faculty" element={<AboutPage />} />
      <Route path="/about/history" element={<AboutPage />} />

      <Route path="/training" element={<TrainingPage />} />
      <Route path="/training/undergraduate" element={<TrainingPage />} />
      <Route path="/training/graduate" element={<TrainingPage />} />
      <Route path="/training/short-term" element={<TrainingPage />} />
      <Route path="/training/distance" element={<TrainingPage />} />

      <Route path="/admissions" element={<AdmissionsPage />} />

      <Route path="/quality-assurance" element={<AboutPage />} />

      <Route path="/research" element={<ResearchPage />} />

      <Route path="/connections" element={<ConnectionsPage />} />
      <Route path="/connections/international" element={<ConnectionsPage />} />
      <Route path="/connections/community" element={<ConnectionsPage />} />
      <Route path="/connections/enterprise" element={<ConnectionsPage />} />
      <Route path="/connections/alumni" element={<ConnectionsPage />} />

      <Route path="/hub4" element={<Hub4Page />} />
      <Route path="/hub4/tour" element={<Hub4Page />} />
      <Route path="/hub4/chatbot" element={<Hub4Page />} />
      <Route path="/hub4/library" element={<Hub4Page />} />

      <Route path="/life" element={<LifePage />} />

      <Route path="/units" element={<UnitsPage />} />

      {/* Portal pages */}
      <Route path="/student-portal" element={<StudentPortalPage />} />
      <Route path="/training-portal" element={<StudentPortalPage />} />
      <Route path="/estudent" element={<StudentPortalPage />} />
      <Route path="/lms" element={<StudentPortalPage />} />
      <Route path="/library" element={<StudentPortalPage />} />
      <Route path="/student-handbook" element={<StudentPortalPage />} />
      <Route path="/dormitory" element={<StudentPortalPage />} />

      <Route path="/faculty-portal" element={<FacultyPortalPage />} />
      <Route path="/eoffice" element={<FacultyPortalPage />} />
      <Route path="/hrm" element={<FacultyPortalPage />} />
      <Route path="/forms" element={<FacultyPortalPage />} />

      {/* Legacy static pages */}
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/news" element={<NewsPage />} />
      <Route path="/news/:slug" element={<PostDetailPage />} />
      <Route path="/contact" element={<ContactPage />} />

      {/* ========================================================= */}
      {/* ENTITY SEO - SEMANTIC PAGES (Theo yêu cầu: SEO Thực Thể) */}
      {/* ========================================================= */}

      {/* 1. Hỗ Trợ Tiếng Anh */}
      <Route path="/ho-tro-tieng-anh" element={
        <SemanticLanding
          title="Hỗ trợ Tiếng Anh Cấp Tốc"
          keyword="hỗ trợ tiếng anh"
          description="Van Trang Edu cung cấp dịch vụ hỗ trợ tiếng Anh toàn diện, từ mất gốc đến nâng cao, luyện thi chứng chỉ VSTEP, B1, B2."
          content="VanTrangEdu là đơn vị hàng đầu trong việc hỗ trợ tiếng Anh cho người đi làm và sinh viên. Chúng tôi tập trung vào phương pháp thực chiến, giúp học viên lấy lại căn bản và đạt chứng chỉ nhanh chóng."
          faqs={[
            { question: "Van Trang Edu hỗ trợ tiếng Anh trình độ nào?", answer: "Chúng tôi hỗ trợ mọi trình độ từ mất gốc (A1) đến nâng cao (C1), đặc biệt là VSTEP và IELTS." },
            { question: "Thời gian học bao lâu?", answer: "Các khóa cấp tốc kéo dài từ 1.5 đến 3 tháng tùy mục tiêu đầu ra." }
          ]}
        />
      } />

      {/* 2. Dạy Ngôn Ngữ */}
      <Route path="/day-ngon-ngu" element={
        <SemanticLanding
          title="Dạy Ngôn Ngữ & Kỹ Năng Mềm"
          keyword="dạy ngôn ngữ"
          description="Trung tâm dạy ngôn ngữ uy tín tại Hà Nội và Online. Đào tạo tiếng Anh, tiếng Trung với lộ trình cá nhân hóa."
          content="Việc dạy ngôn ngữ tại Van Trang Education không chỉ là truyền đạt từ vựng, mà là xây dựng tư duy ngôn ngữ. Chúng tôi áp dụng công nghệ số vào giảng dạy để tối ưu hóa thời gian học tập."
          faqs={[
            { question: "Ngoài tiếng Anh, trung tâm có dạy ngôn ngữ khác không?", answer: "Hiện tại chúng tôi tập trung chuyên sâu vào Tiếng Anh và Tiếng Trung." }
          ]}
        />
      } />

      {/* 3. Trung Tâm Tiếng Anh */}
      <Route path="/trung-tam-tieng-anh" element={
        <SemanticLanding
          title="Trung Tâm Tiếng Anh Vân Trang"
          keyword="trung tâm tiếng anh"
          description="Trung tâm tiếng Anh Vân Trang (Van Trang Edu) - Địa chỉ tin cậy cho hàng ngàn học viên muốn chinh phục ngoại ngữ."
          content="Tìm kiếm một trung tâm tiếng Anh uy tín là bước đầu tiên để thành công. Vân Trang Edu tự hào với đội ngũ giáo viên chất lượng cao và cơ sở vật chất hiện đại, đáp ứng mọi nhu cầu học tập."
          faqs={[
            { question: "Trung tâm có cam kết đầu ra không?", answer: "Có. Tất cả các khóa luyện thi chứng chỉ đều có cam kết đầu ra bằng văn bản." }
          ]}
        />
      } />

      {/* 4. English Support (SEO Song Ngữ) */}
      <Route path="/english-support" element={
        <SemanticLanding
          title="Professional English Support Services"
          keyword="english support"
          lang="en"
          description="Van Trang Edu offers professional English Support services for students and professionals in Vietnam."
          content="Our English Support program is designed to help you overcome language barriers. Whether you need help with academic writing, communication, or exam preparation, Van Trang Edu is here to assist."
          faqs={[
            { question: "Is this course available online?", answer: "Yes, we offer both offline and online support via our LMS platform." }
          ]}
        />
      } />

      {/* 5. Language Center (SEO Song Ngữ) */}
      <Route path="/language-center" element={
        <SemanticLanding
          title="Van Trang Language Center"
          keyword="language center"
          lang="en"
          description="Van Trang Language Center - Top tier language training provider in Vietnam for VSTEP, IELTS, and TOEIC."
          content="Welcome to Van Trang Language Center. We are dedicated to providing the high quality language education. Our mission is to empower Vietnamese students to step into the global world."
          faqs={[
            { question: "Where is the center located?", answer: "We have headquarters in Hanoi and a strong online learning system serving students nationwide." }
          ]}
        />
      } />

      {/* Certificate lookup (public) */}
      <Route path="/certificate/lookup" element={<CertificateLookup />} />
      <Route path="/student-lookup" element={<StudentLookup />} />
      <Route path="/student/lookup" element={<Navigate to="/student-lookup" replace />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* Exam Platform routes */}
      {/* Exam Platform routes (Legacy)
      <Route path="/exam" element={<ExamHomePage />} />
      <Route path="/exam/:type" element={<ExamListPage />} />
      <Route path="/exam/:type/:level" element={<ExamListPage />} />
      <Route path="/exam/test/:testId" element={<ExamTestPage />} />
      <Route path="/exam/result/:attemptId" element={<ExamResultPage />} />
      <Route path="/exam/history" element={<ExamHistoryPage />} />
      */}

      {/* Teacher routes → redirect to admin dashboard */}
      <Route path="/teacher/login" element={<Navigate to="/admin/login" replace />} />
      <Route path="/teacher/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/teacher/dashboard/*" element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="/teacher/*" element={<Navigate to="/admin/dashboard" replace />} />

      {/* Admin routes */}
      <Route path="/admin" element={<AdminLogin />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin/dashboard" element={<AdminDashboard />} />

      {/* VSTEP Management */}
      <Route path="/admin/reset-password" element={<PasswordResetPage />} />

      {/* Student VSTEP now lives on the dedicated VanTrangExam site */}
      <Route path="/dashboard/vstep/*" element={<StudyPlatformRedirect />} />
      <Route path="/student/vstep/*" element={<StudyPlatformRedirect />} />

      {/* Redirect unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <ProductTour />
    </Suspense>
  );
}

function App() {
  // Initialize analytics on app load
  useEffect(() => {
    analytics.init();
  }, []);

  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;
