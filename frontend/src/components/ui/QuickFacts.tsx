/**
 * QuickFacts — khối "thông tin nhanh" kiểu ấn phẩm, đặt ở CỘT PHẢI của hero.
 *
 * Vì sao có component này: nhiều trang công khai của edu để hero chỉ 1 cột hẹp (`max-w-*`) nên
 * **nửa phải màn hình trống** (mẫu lỗi lặp lại: /training, /contact, /about…). Thay vì mỗi trang
 * tự thêm một khối khác nhau, dùng chung component này để giữ đúng ngôn ngữ:
 * đường kẻ mảnh trên cùng · nhãn micro UPPERCASE · giá trị serif lớn · ghi chú nhỏ.
 *
 * Xem DESIGN-SYSTEM.md (mục "số liệu lớn", "kẻ mảnh thay bóng đổ").
 */
export interface QuickFact {
  /** Nhãn nhỏ phía trên (sẽ được in hoa bằng CSS) */
  label: string;
  /** Giá trị chính — hiển thị bằng serif, cỡ lớn */
  value: string;
  /** Ghi chú tuỳ chọn dưới giá trị */
  note?: string;
}

export default function QuickFacts({ title, items }: { title: string; items: QuickFact[] }) {
  return (
    <aside className="border-t border-[var(--color-rule-strong)] pt-5">
      <p className="vt-eyebrow">{title}</p>
      <dl className="mt-5 divide-y divide-[var(--color-rule)]">
        {items.map((item) => (
          <div key={item.label} className="py-4">
            <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--vt-ink-60)]">
              {item.label}
            </dt>
            <dd
              className="mt-1.5 font-display text-[1.3rem] leading-tight text-[var(--vt-ink)]"
              style={{ fontVariationSettings: '"opsz" 48, "SOFT" 30', fontWeight: 600 }}
            >
              {item.value}
            </dd>
            {item.note && (
              <dd className="mt-1 text-[13px] leading-snug text-[var(--vt-ink-60)]">{item.note}</dd>
            )}
          </div>
        ))}
      </dl>
    </aside>
  );
}
