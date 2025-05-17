import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ mode }) => {
  const isDemo = mode === 'demo';

  return {
    plugins: [
      dts({
        include: ['src/prosetyped/**/*.ts'],
        outDir: 'dist/types',
        // 仅在非 demo 模式下启用 dts 插件
        ...(isDemo ? { enabled: false } : {})
      })
    ],
    base: isDemo ? '/prose-typed/' : './',
    build: isDemo ? {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true
    } : {
      lib: {
        entry: resolve('./src/prosetyped/index.ts'),
        name: 'ProseTyped',
        fileName: (format) => `prose-typed.${format}.js`,
        formats: ['es', 'umd']
      },
      rollupOptions: {
        // 确保外部化处理那些你不想打包进库的依赖
        external: ['mitt', 'prosemirror-model'],
        output: {
          // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
          globals: {
            mitt: 'mitt',
            'prosemirror-model': 'prosemirrorModel'
          }
        }
      }
    }
  };
});
