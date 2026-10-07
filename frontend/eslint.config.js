import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/**
 * ESLint 9 flat config — thêm 2026-10-07.
 *
 * Repo trước đây KHÔNG có linter nào (CI chỉ chạy `tsc --noEmit`, mà 200/288 file
 * lại mở đầu bằng `// @ts-nocheck`). Cấu hình này bắt các lỗi "chết người" ở mức
 * error, còn các rule đang ồn ào được để `warn` để có thể bật gate ngay mà không
 * phải sửa hàng nghìn chỗ một lúc — siết dần theo thời gian.
 */
export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'coverage/**',
      'test-results/**',
      'playwright-report/**',
      'e2e/**',
      'src/**/*.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,

      // ─── Lỗi thật, phải chặn ────────────────────────────────────────────────
      'no-debugger': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-unreachable': 'error',
      'no-unsafe-negation': 'error',
      'no-obj-calls': 'error',
      'no-sparse-arrays': 'error',
      'no-cond-assign': 'error',
      'use-isnan': 'error',
      'valid-typeof': 'error',
      'react-hooks/rules-of-hooks': 'error',

      // ─── NỢ KỸ THUẬT đang tồn: để warn để bật được gate ngay ───────────────
      // Số vi phạm lúc thêm config (2026-10-07): rules-of-hooks 12 (BUG THẬT về thứ tự
      // hook — nên sửa rồi bật lại error), set-state-in-effect 68, immutability 60,
      // no-irregular-whitespace 24, prefer-const 10, no-useless-catch 10,
      // no-useless-assignment 5, no-unused-expressions 4, prefer-rest-params 4,
      // refs 3, preserve-caught-error 2, no-unsafe-declaration-merging 2,
      // preserve-manual-memoization 2, static-components 2, prefer-spread 1, purity 1.
      'react-hooks/rules-of-hooks': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/purity': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'no-irregular-whitespace': 'warn',
      'prefer-const': 'warn',
      'no-useless-catch': 'warn',
      'no-useless-assignment': 'warn',
      'preserve-caught-error': 'warn',
      'prefer-rest-params': 'warn',
      'prefer-spread': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unsafe-declaration-merging': 'warn',

      // ─── Đang ồn ào: để warn, siết dần ─────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-namespace': 'off',
      'react-refresh/only-export-components': 'off',
      'react-hooks/exhaustive-deps': 'warn',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-control-regex': 'warn',
      'no-misleading-character-class': 'warn',
      'no-constant-condition': 'warn',
      'no-fallthrough': 'warn',
    },
  },
);
