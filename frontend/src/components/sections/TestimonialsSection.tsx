// @ts-nocheck
import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Quote, BadgeCheck, Star } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import api from '../../services/api';

function Rating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={`${rating}-${index}`}
          size={14}
          className={index < rating ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
        />
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const response = await (api as any).getPublicStudentFeedbacks({
          limit: 6,
          sentiment: 'positive',
        });
        const payload = response?.data ?? response ?? {};
        if (!mounted) return;
        setTestimonials(Array.isArray(payload?.items) ? payload.items : []);
      } catch {
        if (mounted) setTestimonials([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const currentTestimonial = useMemo(
    () => testimonials[currentIndex] || null,
    [currentIndex, testimonials],
  );

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  if (loading) {
    return (
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="container mx-auto px-4">
          <div className="h-80 animate-pulse rounded-[2rem] bg-white" />
        </div>
      </section>
    );
  }

  if (!currentTestimonial) {
    return (
      <section className="bg-gradient-to-br from-green-50 to-blue-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-700">
              <BadgeCheck size={14} />
              Feedback thật từ học viên thật
            </div>
            <h2 className="mt-5 text-3xl font-bold tracking-tight text-slate-900">Mục phản hồi đang chờ dữ liệu đã review</h2>
            <p className="mx-auto mt-3 max-w-2xl text-slate-500">
              Chúng tôi chỉ hiển thị nội dung đã được xác minh từ học viên thật. Khi có feedback phù hợp được duyệt, phần này sẽ cập nhật thay vì dùng lời khen minh hoạ.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const avatarLetter = currentTestimonial.class_name?.charAt(0) || 'V';

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-green-50 to-blue-50 py-20">
      <div className="absolute top-0 left-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-green-200 opacity-20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-blue-200 opacity-20 blur-3xl" />

      <div className="container relative z-10 mx-auto px-4">
        <div className="mb-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 text-xs font-semibold text-emerald-700">
            <BadgeCheck size={14} />
            Phản hồi công khai đã review
          </div>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl text-slate-900">
            Học viên nói gì sau khi học thật?
          </h2>
          <div className="mx-auto mt-4 h-1.5 w-20 rounded-full bg-green-500" />
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            Đây là dữ liệu thật từ hệ thống feedback học viên đã xác minh, không dùng testimonial minh hoạ.
          </p>
        </div>

        <div className="mx-auto max-w-4xl">
          <Card className="overflow-hidden border-none bg-white shadow-2xl">
            <CardContent className="p-0">
              <div className="grid gap-0 md:grid-cols-5">
                <div className="flex flex-col items-center justify-center bg-gradient-to-br from-green-600 to-green-700 p-8 text-center text-white md:col-span-2">
                  <div className="relative mb-4">
                    <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-white bg-white/20 text-4xl font-bold text-white shadow-lg">
                      {avatarLetter}
                    </div>
                    <div className="absolute -bottom-2 -right-2 rounded-full bg-white p-2 text-green-600 shadow-lg">
                      <Quote size={20} />
                    </div>
                  </div>
                  <h3 className="px-2 text-lg font-bold leading-snug">{currentTestimonial.student_name}</h3>
                  <p className="mb-3 mt-1 text-sm text-green-100">{currentTestimonial.class_name}</p>
                  <div className="rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
                    <p className="text-xs font-bold">Feedback đã xác minh</p>
                  </div>
                </div>

                <div className="flex flex-col justify-center p-8 md:col-span-3 md:p-12">
                  <Quote className="mb-4 text-green-200" size={40} />
                  <Rating rating={Number(currentTestimonial.rating || 0)} />
                  <div className="mt-3 text-lg font-bold text-slate-900">{currentTestimonial.title}</div>
                  <blockquote className="mt-4 text-lg italic leading-relaxed text-slate-700">
                    "{currentTestimonial.content}"
                  </blockquote>
                  {currentTestimonial.teacher_response ? (
                    <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-4">
                      <div className="text-sm font-bold text-blue-700">Phản hồi chính thức</div>
                      <div className="mt-2 text-sm leading-relaxed text-slate-700">{currentTestimonial.teacher_response}</div>
                    </div>
                  ) : null}
                </div>
              </div>

              {testimonials.length > 1 ? (
                <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 p-6">
                  <button
                    onClick={prevSlide}
                    className="rounded-full border border-slate-200 bg-white p-2 transition-all hover:border-green-500 hover:bg-green-50"
                    aria-label="Feedback trước"
                  >
                    <ChevronLeft size={20} className="text-slate-600" />
                  </button>

                  <div className="flex gap-2">
                    {testimonials.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentIndex(index)}
                        className={`h-2 rounded-full transition-all ${index === currentIndex ? 'w-8 bg-green-600' : 'w-2 bg-slate-300 hover:bg-slate-400'}`}
                        aria-label={`Chuyển đến feedback ${index + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={nextSlide}
                    className="rounded-full border border-slate-200 bg-white p-2 transition-all hover:border-green-500 hover:bg-green-50"
                    aria-label="Feedback tiếp theo"
                  >
                    <ChevronRight size={20} className="text-slate-600" />
                  </button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
