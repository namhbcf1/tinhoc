import React, { Suspense } from "react";
import { Metadata } from "next";
import { BuilderSummarySidebar, SelectedPart } from "./builder-summary-sidebar";

export const metadata: Metadata = {
  title: "Xây dựng cấu hình PC | Trường Phát Computer",
  description: "Tự do xây dựng cấu hình PC theo ý muốn với tính năng tự động kiểm tra tương thích",
};

// Mô phỏng fetch dữ liệu danh mục linh kiện
async function getDummyCategories() {
  // Giả lập độ trễ mạng
  await new Promise((resolve) => setTimeout(resolve, 1200));

  return [
    { id: "cpu", name: "Vi xử lý (CPU)", icon: "🧠", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "mainboard", name: "Bo mạch chủ (Mainboard)", icon: "🎛️", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "ram", name: "Bộ nhớ trong (RAM)", icon: "🪛", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "vga", name: "Card màn hình (VGA)", icon: "🎮", isRequired: false, desc: "Chưa chọn linh kiện" },
    { id: "storage", name: "Ổ cứng (SSD/HDD)", icon: "💾", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "psu", name: "Nguồn máy tính (PSU)", icon: "⚡", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "case", name: "Vỏ máy tính (Case)", icon: "🖥️", isRequired: true, desc: "Chưa chọn linh kiện" },
    { id: "cooler", name: "Tản nhiệt", icon: "❄️", isRequired: false, desc: "Chưa chọn linh kiện" },
  ];
}

async function BuilderCategories() {
  const categories = await getDummyCategories();

  return (
    <div className="flex flex-col gap-4">
      {categories.map((category) => (
        <div
          key={category.id}
          className="group flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all hover:border-blue-400 hover:shadow-md gap-4 sm:gap-0 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-blue-500"
        >
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-2xl group-hover:bg-blue-100 transition-colors dark:bg-slate-800 dark:group-hover:bg-slate-700">
              {category.icon}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-slate-100">
                {category.name}
                {category.isRequired && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600 dark:bg-red-500/10 dark:text-red-400">
                    BẮT BUỘC
                  </span>
                )}
              </h3>
              <p className="mt-1 text-sm text-gray-500 font-medium dark:text-slate-400">{category.desc}</p>
            </div>
          </div>

          <button className="w-full sm:w-auto shrink-0 rounded-lg bg-gray-50 px-5 py-2.5 text-sm font-semibold text-gray-700 outline-none ring-blue-200 transition-all hover:bg-blue-600 hover:text-white hover:ring-4 focus:ring-4 dark:bg-slate-800 dark:text-slate-300 dark:ring-blue-900 dark:hover:bg-blue-600 dark:hover:text-white">
            Chọn linh kiện
          </button>
        </div>
      ))}
    </div>
  );
}

function CategoriesSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between rounded-xl border border-gray-100 bg-white p-5 shadow-sm gap-4 sm:gap-0 dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <div className="h-14 w-14 rounded-xl bg-gray-100 animate-pulse dark:bg-slate-800"></div>
            <div className="space-y-2">
              <div className="h-5 w-40 rounded bg-gray-100 animate-pulse dark:bg-slate-800"></div>
              <div className="h-4 w-28 rounded bg-gray-100 animate-pulse dark:bg-slate-800"></div>
            </div>
          </div>
          <div className="h-10 w-full sm:w-32 rounded-lg bg-gray-100 animate-pulse dark:bg-slate-800"></div>
        </div>
      ))}
    </div>
  );
}

export default async function PcBuilderPage() {
  // Dữ liệu giả lập linh kiện đã chọn để minh họa giao diện Server Component
  const dummySelectedParts: SelectedPart[] = [
    {
      id: "cpu-1",
      type: "CPU",
      name: "CPU Intel Core i5-13400F (Up To 4.60GHz, 10 Nhân 16 Luồng, 20MB Cache, Socket 1700)",
      priceRetail: 5290000,
    },
    {
      id: "main-1",
      type: "Mainboard",
      name: "Mainboard ASUS TUF GAMING B760M-PLUS WIFI DDR5",
      priceRetail: 4390000,
    }
  ];

  const dummyTotalPrice = dummySelectedParts.reduce((total, part) => total + part.priceRetail, 0);
  const warnings = [
    "Cấu hình chưa có Bộ nhớ trong (RAM).",
    "Cấu hình chưa có Ổ cứng (SSD/HDD).",
    "Cấu hình chưa có Nguồn (PSU)."
  ];

  return (
    <main className="min-h-screen bg-slate-50 pb-20 pt-8 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 border-b border-gray-200 pb-6 dark:border-slate-700">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 md:text-4xl dark:text-slate-100">
            Xây dựng cấu hình PC
          </h1>
          <p className="mt-2 text-lg text-gray-600 dark:text-slate-400">
            Tự do tùy biến máy tính với các linh kiện chính hãng. Tự động kiểm tra độ tương thích.
          </p>
        </div>

        {/* Bố cục chính */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">

          {/* Lưới dánh sách linh kiện (Bên trái) */}
          <div className="flex-1 w-full min-w-0">
            <div className="mb-5 flex items-start sm:items-center gap-3 rounded-lg border border-blue-100 bg-blue-50 p-4 text-blue-800 shadow-sm dark:border-blue-900/50 dark:bg-blue-500/10 dark:text-blue-300">
              <svg className="h-6 w-6 shrink-0 mt-0.5 sm:mt-0 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium leading-relaxed">
                Vui lòng chọn lần lượt các linh kiện theo thứ tự từ trên xuống dưới để hệ thống kiểm tra tính tương thích một cách chính xác nhất.
              </span>
            </div>

            <Suspense fallback={<CategoriesSkeleton />}>
              <BuilderCategories />
            </Suspense>
          </div>

          {/* Cột tóm tắt cấu hình (Bên phải) */}
          <div className="w-full lg:w-auto shrink-0 relative">
             <BuilderSummarySidebar
               selectedParts={dummySelectedParts}
               totalPrice={dummyTotalPrice}
               warnings={warnings}
             />
          </div>

        </div>
      </div>
    </main>
  );
}