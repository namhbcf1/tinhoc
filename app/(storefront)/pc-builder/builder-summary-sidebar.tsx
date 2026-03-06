"use client";

import React from "react";

export interface SelectedPart {
  id: string;
  type: string;
  name: string;
  priceRetail: number;
  imageUrl?: string;
}

interface BuilderSummarySidebarProps {
  selectedParts: SelectedPart[];
  totalPrice: number;
  warnings?: string[];
  onRemovePart?: (id: string) => void;
  onAddToCart?: () => void;
}

export function BuilderSummarySidebar({
  selectedParts,
  totalPrice,
  warnings = [],
  onRemovePart,
  onAddToCart,
}: BuilderSummarySidebarProps) {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const isCheckoutDisabled = selectedParts.length === 0 || warnings.length > 0;

  return (
    <aside className="sticky top-24 flex w-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg lg:w-80 xl:w-96 dark:border-slate-700 dark:bg-slate-800 dark:shadow-none">
      {/* Header */}
      <div className="border-b border-gray-100 bg-gray-50/80 p-5 dark:border-slate-700 dark:bg-slate-800/50">
        <h2 className="text-lg font-bold text-gray-900 dark:text-slate-100">Cấu hình PC của bạn</h2>
        <p className="mt-1 text-sm font-medium text-gray-500 dark:text-slate-400">
          Đã chọn <span className="text-blue-600 dark:text-blue-400">{selectedParts.length}</span> linh kiện
        </p>
      </div>

      {/* Cảnh báo tương thích */}
      {warnings.length > 0 && (
        <div className="border-b border-red-100 bg-red-50 p-4 dark:border-red-900/30 dark:bg-red-500/10">
          <div className="mb-2 flex items-center gap-2 font-semibold text-red-700 dark:text-red-400">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Cảnh báo tương thích</span>
          </div>
          <ul className="list-inside list-disc space-y-1 text-sm text-red-600 dark:text-red-400/80">
            {warnings.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Danh sách linh kiện */}
      <div className="flex-1 overflow-y-auto max-h-[50vh] p-4">
        {selectedParts.length === 0 ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-10 text-gray-400 dark:text-slate-500">
            <svg className="h-12 w-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="text-center text-sm font-medium">Chưa có linh kiện nào.</p>
            <p className="text-center text-xs">Vui lòng chọn linh kiện bên trái.</p>
          </div>
        ) : (
          <ul className="space-y-4">
            {selectedParts.map((part) => (
              <li key={part.id} className="group flex items-start justify-between gap-3 rounded-lg border border-transparent p-2 transition-colors hover:border-gray-100 hover:bg-gray-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/50">
                <div className="flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                    {part.type}
                  </span>
                  <h3 className="mt-0.5 line-clamp-2 text-sm font-medium text-gray-800 dark:text-slate-200">
                    {part.name}
                  </h3>
                  <p className="mt-1 font-semibold text-red-600 dark:text-red-400">
                    {formatPrice(part.priceRetail)}
                  </p>
                </div>
                {onRemovePart && (
                  <button
                    onClick={() => onRemovePart(part.id)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 opacity-0 transition-all hover:bg-red-100 hover:text-red-600 focus:opacity-100 group-hover:opacity-100 dark:text-slate-500 dark:hover:bg-red-500/20 dark:hover:text-red-400"
                    title="Xóa linh kiện"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer Tổng tiền & Action */}
      <div className="border-t border-gray-200 bg-gray-50 p-5 dark:border-slate-700 dark:bg-slate-800/80">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600 dark:text-slate-400">Tổng tạm tính:</span>
          <span className="text-2xl font-bold text-red-600 shadow-sm dark:text-red-400 dark:shadow-none">
            {formatPrice(totalPrice)}
          </span>
        </div>

        <button
          onClick={onAddToCart}
          disabled={isCheckoutDisabled}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white shadow-md transition-all hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 disabled:shadow-none dark:disabled:bg-slate-800 dark:disabled:text-slate-500"
        >
          {warnings.length > 0 ? (
            <span>Vui lòng xử lý cảnh báo</span>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 0a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <span>Thêm vào giỏ hàng</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}