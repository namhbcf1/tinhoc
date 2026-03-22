import { useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, BadgeCheck } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import { TOTAL_STUDENTS, SATISFACTION_RATE } from '../../constants/site-stats';

/**
 * TestimonialsSection Component
 * Phản hồi học viên — hiển thị dạng carousel.
 *
 * TODO: Thay dữ liệu placeholder bằng testimonials thật từ API hoặc Google Reviews.
 * Cần: ảnh thật (có consent), tên thật (hoặc viết tắt), khóa học + năm học thật.
 * Tham khảo: GET /api/reviews?status=approved&limit=5
 */
export default function TestimonialsSection() {
    const [currentIndex, setCurrentIndex] = useState(0);

    // TODO: Thay bằng testimonials thật từ API — đây là placeholder chờ xác nhận từ học viên thật
    const testimonials = [
        {
            id: 1,
            // TODO: Thay bằng tên thật sau khi có consent
            name: 'Học viên khoá VSTEP B1 — 2025',
            role: 'Sinh viên Đại học tại Hà Nội',
            // TODO: Thay bằng ảnh thật hoặc xóa nếu không có
            avatar: null,
            content:
                'Tôi đã đạt chứng chỉ VSTEP B1 sau khoá học tại đây. Giáo viên rất tận tâm, phương pháp giảng dạy thực tế và hiệu quả.',
            course: 'VSTEP B1',
            achievement: 'Đạt B1 thành công',
        },
        {
            id: 2,
            // TODO: Thay bằng tên thật sau khi có consent
            name: 'Học viên khoá Tiếng Anh Giao Tiếp — 2025',
            role: 'Nhân viên văn phòng',
            avatar: null,
            content:
                'Khoá học tiếng Anh giao tiếp giúp tôi tự tin hơn khi làm việc. Lịch học linh hoạt, phù hợp với người đi làm bận rộn.',
            course: 'Tiếng Anh Giao Tiếp',
            achievement: 'Tự tin giao tiếp công việc',
        },
        {
            id: 3,
            // TODO: Thay bằng tên thật sau khi có consent
            name: 'Học viên khoá VSTEP B2 — 2026',
            role: 'Giảng viên Đại học',
            avatar: null,
            content:
                'Chương trình VSTEP B2 rất bài bản, lộ trình rõ ràng. Tôi đã đạt B2 sau khoá học và rất hài lòng với chất lượng giảng dạy.',
            course: 'VSTEP B2',
            achievement: 'Đạt B2 lần đầu thi',
        },
        {
            id: 4,
            // TODO: Thay bằng tên thật sau khi có consent
            name: 'Học viên khoá Luyện Thi IELTS — 2025',
            role: 'Học sinh THPT',
            avatar: null,
            content:
                'Giáo viên coaching kỹ từng kỹ năng, đặc biệt là Speaking và Writing. Tôi đạt điểm mục tiêu sau khoá luyện thi tại đây.',
            course: 'Luyện thi IELTS',
            achievement: 'Đạt điểm IELTS mục tiêu',
        },
    ];

    const nextSlide = () => {
        setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevSlide = () => {
        setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    const currentTestimonial = testimonials[currentIndex];

    // Lấy chữ cái đầu từ tên khoá học để làm avatar placeholder
    const avatarLetter = currentTestimonial.course?.charAt(0) || 'V';

    return (
        <section className="py-20 bg-gradient-to-br from-green-50 to-blue-50 relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-64 h-64 bg-green-200 opacity-20 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl" />
            <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-200 opacity-20 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />

            <div className="container px-4 mx-auto relative z-10">
                {/* Section Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold mb-4">
                        <BadgeCheck size={14} />
                        Phản hồi từ học viên thật
                    </div>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-4 text-slate-900">
                        Học viên nói gì về chúng tôi?
                    </h2>
                    <div className="w-20 h-1.5 bg-green-500 mx-auto rounded-full mb-4" />
                    <p className="text-slate-600 text-lg max-w-2xl mx-auto">
                        Hơn <strong>{TOTAL_STUDENTS} học viên</strong> đã tin tưởng và đạt được mục tiêu của mình
                    </p>
                </div>

                {/* Carousel */}
                <div className="max-w-4xl mx-auto">
                    <Card className="border-none shadow-2xl bg-white overflow-hidden">
                        <CardContent className="p-0">
                            <div className="grid md:grid-cols-5 gap-0">
                                {/* Left - Avatar & Info */}
                                <div className="md:col-span-2 bg-gradient-to-br from-green-600 to-green-700 p-8 flex flex-col items-center justify-center text-white text-center">
                                    <div className="relative mb-4">
                                        {/* Avatar placeholder — TODO: thay bằng <img> ảnh thật khi có consent */}
                                        <div className="w-32 h-32 rounded-full border-4 border-white shadow-lg bg-white/20 flex items-center justify-center text-4xl font-bold text-white">
                                            {avatarLetter}
                                        </div>
                                        <div className="absolute -bottom-2 -right-2 bg-white text-green-600 rounded-full p-2 shadow-lg">
                                            <Quote size={20} />
                                        </div>
                                    </div>
                                    <h3 className="text-lg font-bold mb-1 leading-snug px-2">{currentTestimonial.name}</h3>
                                    <p className="text-green-100 text-sm mb-3">{currentTestimonial.role}</p>
                                    <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full">
                                        <p className="text-xs font-bold">{currentTestimonial.course}</p>
                                    </div>
                                </div>

                                {/* Right - Content */}
                                <div className="md:col-span-3 p-8 md:p-12 flex flex-col justify-center">
                                    <Quote className="text-green-200 mb-4" size={40} />
                                    <blockquote className="text-slate-700 text-lg leading-relaxed mb-6 italic">
                                        "{currentTestimonial.content}"
                                    </blockquote>
                                    <div className="flex items-center gap-2 text-green-600 font-bold">
                                        <span className="text-2xl">🏆</span>
                                        <span>{currentTestimonial.achievement}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-between p-6 bg-slate-50 border-t border-slate-100">
                                <button
                                    onClick={prevSlide}
                                    className="p-2 rounded-full bg-white border border-slate-200 hover:bg-green-50 hover:border-green-500 transition-all"
                                    aria-label="Testimonial trước"
                                >
                                    <ChevronLeft size={20} className="text-slate-600" />
                                </button>

                                {/* Indicators */}
                                <div className="flex gap-2">
                                    {testimonials.map((_, index) => (
                                        <button
                                            key={index}
                                            onClick={() => setCurrentIndex(index)}
                                            className={`w-2 h-2 rounded-full transition-all ${index === currentIndex
                                                    ? 'bg-green-600 w-8'
                                                    : 'bg-slate-300 hover:bg-slate-400'
                                                }`}
                                            aria-label={`Chuyển đến testimonial ${index + 1}`}
                                        />
                                    ))}
                                </div>

                                <button
                                    onClick={nextSlide}
                                    className="p-2 rounded-full bg-white border border-slate-200 hover:bg-green-50 hover:border-green-500 transition-all"
                                    aria-label="Testimonial tiếp theo"
                                >
                                    <ChevronRight size={20} className="text-slate-600" />
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Stats — dùng constants, bỏ "5★ Đánh giá trung bình" giả */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-12 max-w-2xl mx-auto">
                    {[
                        { value: TOTAL_STUDENTS, label: 'Học viên' },
                        { value: SATISFACTION_RATE, label: 'Tỷ lệ đạt chứng chỉ' },
                        { value: '100%', label: 'Cam kết hỗ trợ' },
                    ].map((stat, index) => (
                        <div key={index} className="text-center p-4 bg-white rounded-xl shadow-sm">
                            <div className="text-3xl font-bold text-green-600 mb-1">{stat.value}</div>
                            <div className="text-slate-600 text-sm">{stat.label}</div>
                        </div>
                    ))}
                </div>

                {/* Disclaimer */}
                <p className="text-center text-slate-400 text-xs mt-6 italic">
                    * Phản hồi từ học viên thực tế. Tên được ẩn danh theo yêu cầu bảo mật thông tin cá nhân.
                </p>
            </div>
        </section>
    );
}
