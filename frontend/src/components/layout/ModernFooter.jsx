import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, MapPin, Phone, Mail } from 'lucide-react';

export default function ModernFooter() {
    return (
        <footer className="bg-slate-50 text-slate-700 pt-16 pb-8 border-t border-slate-200">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    {/* Brand */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-green-700 uppercase">CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG</h3>
                        <p className="text-slate-600 text-sm leading-relaxed">
                            Phát triển năng lực ngoại ngữ cho người Việt
                        </p>
                        <div className="text-sm text-slate-600">
                            <p><span className="font-semibold">Mã số thuế:</span> 0110058563</p>
                            <p><span className="font-semibold">Người đại diện:</span> Phạm Thị Vân Trang</p>
                        </div>
                        <div className="flex gap-4">
                            <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded bg-white border border-slate-200 flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors shadow-sm">
                                <Facebook size={18} />
                            </a>
                        </div>
                    </div>

                    {/* Dịch vụ */}
                    <div>
                        <h4 className="font-bold text-green-700 mb-6 uppercase">Dịch vụ</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/training" className="hover:text-green-600 transition-colors">Đào tạo</Link></li>
                            <li><Link to="/admissions" className="hover:text-green-600 transition-colors">Đăng ký khóa học</Link></li>
                            <li><Link to="/news" className="hover:text-green-600 transition-colors">Tin tức & Blog</Link></li>
                            <li><Link to="/about" className="hover:text-green-600 transition-colors">Về chúng tôi</Link></li>
                            <li><Link to="/contact" className="hover:text-green-600 transition-colors">Liên hệ</Link></li>
                        </ul>
                    </div>

                    {/* Chương trình & Hỗ trợ */}
                    <div>
                        <h4 className="font-bold text-green-700 mb-6 uppercase">Chương trình & Hỗ trợ</h4>
                        <ul className="space-y-3 text-sm">
                            <li><Link to="/training" className="hover:text-green-600 transition-colors">Tiếng Anh Giao Tiếp</Link></li>
                            <li><Link to="/training" className="hover:text-green-600 transition-colors">Luyện Thi Chứng Chỉ</Link></li>
                            {/* Entity SEO Links */}
                            <li><Link to="/ho-tro-tieng-anh" className="hover:text-green-600 transition-colors" title="Dịch vụ hỗ trợ tiếng Anh">Hỗ Trợ Tiếng Anh</Link></li>
                            <li><Link to="/day-ngon-ngu" className="hover:text-green-600 transition-colors" title="Dạy ngôn ngữ uy tín">Dạy Ngôn Ngữ</Link></li>
                            <li><Link to="/trung-tam-tieng-anh" className="hover:text-green-600 transition-colors" title="Trung tâm tiếng Anh Vân Trang">Trung Tâm Tiếng Anh</Link></li>
                            <li><Link to="/english-support" className="hover:text-green-600 transition-colors text-slate-500 italic">English Support Services</Link></li>
                            <li><Link to="/language-center" className="hover:text-green-600 transition-colors text-slate-500 italic">Language Center</Link></li>
                        </ul>
                    </div>

                    {/* Thông tin liên hệ */}
                    <div>
                        <h4 className="font-bold text-green-700 mb-6 uppercase">Thông tin liên hệ</h4>
                        <ul className="space-y-4 text-sm text-slate-600">
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold mb-1 text-slate-800">
                                    <Phone className="text-green-600" size={16} /> Điện thoại:
                                </div>
                                <a href="tel:0962445963" className="hover:text-green-600 ml-6 block">📞 096 244 5963</a>
                                <a href="tel:0339244566" className="hover:text-green-600 ml-6 block">📞 0339 244 566</a>
                            </li>
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold mb-1 text-slate-800">
                                    <Mail className="text-green-600" size={16} /> Email:
                                </div>
                                <a href="mailto:[email protected]" className="hover:text-green-600 ml-6 block">[email protected]</a>
                            </li>
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold mb-1 text-slate-800">
                                    <span className="text-green-600 font-bold text-lg">Z</span> Zalo:
                                </div>
                                <a href="https://zalo.me/0962445963" target="_blank" rel="noopener noreferrer" className="ml-6 block hover:text-green-600 transition-colors">096 244 5963</a>
                                <a href="https://zalo.me/0339244566" target="_blank" rel="noopener noreferrer" className="ml-6 block hover:text-green-600 transition-colors">0339 244 566</a>
                            </li>
                            <li className="flex flex-col gap-1">
                                <div className="flex items-center gap-2 font-bold mb-1 text-slate-800">
                                    <Facebook className="text-blue-600" size={16} /> Facebook:
                                </div>
                                <a href="https://www.facebook.com/Englishvantrang" target="_blank" rel="noopener noreferrer" className="hover:text-green-600 ml-6 block">Englishvantrang</a>
                            </li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-slate-200 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>© {new Date().getFullYear()} CÔNG TY TNHH TƯ VẤN GIÁO DỤC SƠN TRANG.</p>
                    <div className="flex gap-6">
                        <Link to="/privacy" className="hover:text-green-600 transition-colors">Chính sách bảo mật</Link>
                        <Link to="/terms" className="hover:text-green-600 transition-colors">Điều khoản sử dụng</Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}
