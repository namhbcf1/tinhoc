import Link from "next/link";
import { GraduationCap, ArrowRight, BookOpen, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <GraduationCap className="h-6 w-6 text-primary" />
          <span className="font-bold text-xl text-primary">VantrangEdu</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">
            Chương Trình Học
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">
            Thi Thử VSTEP
          </Link>
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="#">
            Tra Cứu Điểm
          </Link>
          <Link href="/dang-nhap">
            <Button variant="outline" size="sm">Đăng Nhập</Button>
          </Link>
        </nav>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-muted/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center space-y-4 text-center">
              <div className="space-y-2 max-w-3xl">
                <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl lg:text-6xl/none text-primary">
                  Nền Tảng Đào Tạo & Khảo Thí Thế Hệ Mới
                </h1>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed pt-4">
                  Quản lý học tập thông minh, luyện thi VSTEP/TOEIC thời gian thực, và nhận chứng chỉ tự động với công nghệ tối tân nhất năm 2026.
                </p>
              </div>
              <div className="flex flex-col gap-2 min-[400px]:flex-row pt-6">
                <Link href="/dang-ky">
                  <Button size="lg" className="gap-2">
                    Đăng Ký Học Ngay <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/admin/dashboard">
                  <Button variant="outline" size="lg">
                    Vào Trang Quản Trị
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Hệ Thống Realtime</h3>
                <p className="text-muted-foreground">
                  Phòng thi trực tuyến siêu tốc, tự động lưu bài làm tránh sập mạng.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Quản Lý Thông Minh</h3>
                <p className="text-muted-foreground">
                  Theo dõi lịch học, điểm danh 1 chạm và bài tập được tích hợp ngay trên App.
                </p>
              </div>
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold">Bảo Mật Edge Cloudflare</h3>
                <p className="text-muted-foreground">
                  Xác thực mạnh mẽ, mã hóa đường truyền và nhận diện CCCD tự động bằng AI.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-muted/20">
        <p className="text-xs text-muted-foreground">
          © 2026 VantrangEdu. All rights reserved.
        </p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Điều khoản dịch vụ
          </Link>
          <Link className="text-xs hover:underline underline-offset-4" href="#">
            Chính sách bảo mật
          </Link>
        </nav>
      </footer>
    </div>
  );
}
