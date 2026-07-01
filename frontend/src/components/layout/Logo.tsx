// @ts-nocheck
import '../../styles/public/Logo.css';

/**
 * Logo component — above-the-fold branding element.
 * Uses <picture> for WebP with JPEG fallback.
 * Explicit width/height prevents CLS. fetchpriority="high" aids LCP.
 */
export default function Logo() {
  return (
    <div className="logo-container">
      <div className="logo-icon">
        <picture>
          {/* WebP — 256px optimised version (6.9 KB vs 180 KB original) */}
          <source srcSet="/logo-256.webp" type="image/webp" />
          {/* JPEG fallback */}
          <img
            src="/logo.jpg"
            alt="VAN TRANG EDUCATION Logo"
            className="logo-image"
            width={70}
            height={60}
            fetchpriority="high"
            decoding="sync"
          />
        </picture>
      </div>
      <div className="logo-text">
        <div className="logo-main">VAN TRANG</div>
        <div className="logo-sub">EDUCATION</div>
      </div>
    </div>
  );
}
