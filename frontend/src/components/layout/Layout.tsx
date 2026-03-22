import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslation } from '../../utils/translations';
import { getStorageValue } from '../../utils/browser-storage.js';
import api from '../../services/api';
import Logo from './Logo';
import '../../styles/public/Layout.css';

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { language, changeLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isStudentLoggedIn, setIsStudentLoggedIn] = useState(
    !!getStorageValue('student_token')
  );
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' && window.innerWidth < 968
  );

  // Listen for storage changes (multi-tab support)
  useEffect(() => {
    const handleStorageChange = () => {
      setIsStudentLoggedIn(!!getStorageValue('student_token'));
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Listen for window resize to update mobile state
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 968);
      // Close dropdowns on mobile when resizing
      if (window.innerWidth >= 968) {
        setActiveDropdown(null);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = () => {
    api.logoutRole('student');
    setIsStudentLoggedIn(false);
    navigate('/login');
  };

  // Sửa isActive để hỗ trợ nested routes
  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/' ? 'active' : '';
    }
    return location.pathname.startsWith(path) ? 'active' : '';
  };

  const toggleDropdown = (menuKey) => {
    setActiveDropdown(activeDropdown === menuKey ? null : menuKey);
  };

  const t = (key) => getTranslation(key, language);

  const menuItems = [
    {
      key: 'students',
      label: t('studentsNav'),
      path: '/student-portal',
      submenu: [
        { label: 'Cổng thông tin đào tạo', path: '/training-portal' },
        { label: 'E-Student', path: '/estudent' },
        { label: 'Học trực tuyến HUB-LMS', path: '/lms' },
        { label: 'Thư viện', path: '/library' },
        { label: 'Cẩm nang sinh viên', path: '/student-handbook' },
        { label: 'Ký túc xá', path: '/dormitory' },
      ]
    },
    {
      key: 'faculty',
      label: t('faculty'),
      path: '/faculty-portal',
      submenu: [
        { label: 'Hệ thống EOffice', path: '/eoffice' },
        { label: 'Hệ thống HRM', path: '/hrm' },
        { label: 'Biểu mẫu', path: '/forms' },
      ]
    },
    {
      key: 'about',
      label: t('about'),
      path: '/about',
      submenu: [
        { label: 'Tổng quan về HUB', path: '/about/overview' },
        { label: 'Tầm nhìn - Sứ mệnh', path: '/about/vision' },
        { label: 'Bộ máy tổ chức', path: '/about/organization' },
        { label: 'Cơ sở vật chất', path: '/about/facilities' },
        { label: 'Đội ngũ giảng viên', path: '/about/faculty' },
        { label: 'Lịch sử hình thành', path: '/about/history' },
      ]
    },
    {
      key: 'training',
      label: t('training'),
      path: '/training',
      submenu: [
        { label: 'Đại học chính quy', path: '/training/undergraduate' },
        { label: 'Sau Đại học', path: '/training/graduate' },
        { label: 'Đào tạo ngắn hạn', path: '/training/short-term' },
        { label: 'Đào tạo từ xa', path: '/training/distance' },
      ]
    },
    {
      key: 'admissions',
      label: t('admissions'),
      path: '/admissions'
    },
    {
      key: 'quality',
      label: t('quality'),
      path: '/quality-assurance'
    },
    {
      key: 'research',
      label: t('research'),
      path: '/research'
    },
    {
      key: 'connections',
      label: t('connections'),
      path: '/connections',
      submenu: [
        { label: 'Hợp tác quốc tế', path: '/connections/international' },
        { label: 'Kết nối Cộng đồng', path: '/connections/community' },
        { label: 'Kết nối Doanh nghiệp', path: '/connections/enterprise' },
        { label: 'Kết nối Cựu người học', path: '/connections/alumni' },
      ]
    },
    {
      key: 'hub4',
      label: t('hub4'),
      path: '/hub4',
      submenu: [
        { label: 'HUB Tour', path: '/hub4/tour' },
        { label: 'Chat bot AI', path: '/hub4/chatbot' },
        { label: 'Thư viện điện tử', path: '/hub4/library' },
      ]
    },
    {
      key: 'life',
      label: t('life'),
      path: '/life'
    },
    {
      key: 'units',
      label: t('units'),
      path: '/units'
    },
  ];

  return (
    <div className="layout">
      {/* Top Bar */}
      <div className="top-bar">
        <div className="top-bar-container">
          <div className="top-bar-left">
            <a href={`mailto:${t('email')}`} className="top-bar-link">
              <span className="icon">✉</span> {t('email')}
            </a>
            <a href={`tel:${t('phone1').replace(/\s/g, '')}`} className="top-bar-link">
              <span className="icon">📞</span> {t('phone1')}
            </a>
            <a href={`tel:${t('phone2').replace(/\s/g, '')}`} className="top-bar-link">
              <span className="icon">📞</span> {t('phone2')}
            </a>
          </div>
          <div className="top-bar-right">
            {isStudentLoggedIn ? (
              <>
                <Link to="/dashboard" className="top-bar-btn top-bar-btn-outline">
                  {t('dashboard')}
                </Link>
                <button onClick={handleLogout} className="top-bar-btn top-bar-btn-ghost">
                  {t('logout')}
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="top-bar-btn top-bar-btn-outline">
                  🔐 {t('login')}
                </Link>
                <Link to="/register" className="top-bar-btn top-bar-btn-primary">
                  ✨ {t('register')}
                </Link>
              </>
            )}
            <div className="lang-separator"></div>
            <button 
              className={`lang-btn ${language === 'vi' ? 'active' : ''}`}
              onClick={() => changeLanguage('vi')}
            >
              VI
            </button>
            <button 
              className={`lang-btn ${language === 'en' ? 'active' : ''}`}
              onClick={() => changeLanguage('en')}
            >
              EN
            </button>
          </div>
        </div>
      </div>

      {/* Main Navbar - Ẩn khi học viên đã đăng nhập */}
      {!isStudentLoggedIn && (
        <nav className="navbar">
          <div className="navbar-container">
            <Link to="/" className="navbar-logo">
              <Logo />
            </Link>

            <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
              {menuItems.map((item) => (
              <li 
                key={item.key} 
                className={item.submenu ? 'has-dropdown' : ''}
                onMouseEnter={() => !isMobile && item.submenu && setActiveDropdown(item.key)}
                onMouseLeave={() => !isMobile && item.submenu && setActiveDropdown(null)}
              >
                <Link 
                  to={item.path} 
                  className={isActive(item.path)}
                  onClick={() => isMobile && item.submenu && toggleDropdown(item.key)}
                >
                  {item.label}
                  {item.submenu && <span className="dropdown-arrow">▼</span>}
                </Link>
                {item.submenu && (
                  <ul className={`dropdown-menu ${activeDropdown === item.key ? 'active' : ''}`}>
                    {item.submenu.map((sub, subIdx) => (
                      <li key={`${item.key}-sub-${subIdx}`}>
                        <Link to={sub.path} onClick={() => {
                          setMobileMenuOpen(false);
                          setActiveDropdown(null);
                        }}>
                          {sub.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
              ))}
            </ul>

            <div className="navbar-actions">
              <button 
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Student Navbar - Hiển thị khi học viên đã đăng nhập */}
      {isStudentLoggedIn && (
        <nav className="navbar student-navbar">
          <div className="navbar-container">
            <Link to="/dashboard" className="navbar-logo">
              <Logo />
            </Link>

            <ul className={`navbar-menu ${mobileMenuOpen ? 'active' : ''}`}>
              <li>
                <Link to="/dashboard" className={isActive('/dashboard')}>
                  📊 {t('dashboard')}
                </Link>
              </li>
              <li>
                <Link to="/dashboard/exams" className={isActive('/dashboard/exams')}>
                  📝 Lịch thi
                </Link>
              </li>
              <li>
                <Link to="/dashboard/profile" className={isActive('/dashboard/profile')}>
                  👤 Hồ sơ
                </Link>
              </li>
              </ul>

            <div className="navbar-actions">
              <button 
                className="mobile-menu-toggle"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="main-content">
        {children}
      </main>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-section">
            <h3>CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG</h3>
            <p className="footer-tagline">Phát triển năng lực ngoại ngữ cho người Việt</p>
            <p className="footer-tax">Mã số thuế: 0110058563</p>
            <p className="footer-representative">Người đại diện: Phạm Thị Vân Trang</p>
          </div>
          
          <div className="footer-section">
            <h4>Thông tin liên hệ</h4>
            <ul className="contact-list">
              <li className="contact-item-footer">
                <strong>Điện thoại:</strong>
                <div className="phone-numbers">
                  <a href="tel:0962445963" className="phone-link">📞 096 244 5963</a>
                  <a href="tel:0339244566" className="phone-link">📞 0339 244 566</a>
                </div>
              </li>
              <li className="contact-item-footer">
                <strong>Email:</strong>
                <a href="mailto:[email protected]" className="email-link">📧 [email protected]</a>
              </li>
              <li className="contact-item-footer">
                <strong>Zalo:</strong>
                <div className="social-links">
                  <a href="https://zalo.me/0962445963" target="_blank" rel="noopener noreferrer" className="zalo-link">
                    <svg className="social-icon zalo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#0068FF"/>
                      <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16.5C9.52 16.5 7.5 14.48 7.5 12C7.5 9.52 9.52 7.5 12 7.5C14.48 7.5 16.5 9.52 16.5 12C16.5 14.48 14.48 16.5 12 16.5Z" fill="white"/>
                      <path d="M10.5 10.5C10.5 10.5 9.5 11.5 9.5 12C9.5 12.5 10.5 13.5 10.5 13.5M13.5 10.5C13.5 10.5 14.5 11.5 14.5 12C14.5 12.5 13.5 13.5 13.5 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 15C9 15 10.5 13.5 12 13.5C13.5 13.5 15 15 15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>096 244 5963</span>
                  </a>
                  <a href="https://zalo.me/0339244566" target="_blank" rel="noopener noreferrer" className="zalo-link">
                    <svg className="social-icon zalo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" fill="#0068FF"/>
                      <path d="M12 6C8.69 6 6 8.69 6 12C6 15.31 8.69 18 12 18C15.31 18 18 15.31 18 12C18 8.69 15.31 6 12 6ZM12 16.5C9.52 16.5 7.5 14.48 7.5 12C7.5 9.52 9.52 7.5 12 7.5C14.48 7.5 16.5 9.52 16.5 12C16.5 14.48 14.48 16.5 12 16.5Z" fill="white"/>
                      <path d="M10.5 10.5C10.5 10.5 9.5 11.5 9.5 12C9.5 12.5 10.5 13.5 10.5 13.5M13.5 10.5C13.5 10.5 14.5 11.5 14.5 12C14.5 12.5 13.5 13.5 13.5 13.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                      <path d="M9 15C9 15 10.5 13.5 12 13.5C13.5 13.5 15 15 15 15" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    <span>0339 244 566</span>
                  </a>
                </div>
              </li>
              <li className="contact-item-footer">
                <strong>Facebook:</strong>
                <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noopener noreferrer" className="facebook-link">
                  <svg className="social-icon facebook-icon" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  <span>Englishvantrang</span>
                </a>
              </li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Dịch vụ</h4>
            <ul>
              <li><Link to="/training">Đào tạo</Link></li>
              <li><Link to="/admissions">Đăng ký khóa học</Link></li>
              <li><Link to="/about">Về chúng tôi</Link></li>
              <li><Link to="/training">Hỗ Trợ Ngoại Ngữ Cấp Tốc</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Chương trình</h4>
            <ul>
              <li><Link to="/training">Tiếng Anh Giao Tiếp</Link></li>
              <li><Link to="/training">Luyện Thi Chứng Chỉ</Link></li>
              <li><Link to="/training">Tiếng Anh Chuyên Ngành</Link></li>
              <li><Link to="/training">Đào Tạo Theo Nhu Cầu</Link></li>
            </ul>
          </div>

          <div className="footer-section">
            <h4>Thông tin</h4>
            <ul>
              <li><Link to="/about">Giới thiệu</Link></li>
              <li><Link to="/admissions">Đăng ký</Link></li>
              <li><Link to="/training">Chương trình đào tạo</Link></li>
              <li><a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noopener noreferrer">Facebook Page</a></li>
            </ul>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>Copyright © 2024 CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG. Mã số thuế: 0110058563. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}
