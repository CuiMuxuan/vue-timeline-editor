import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import dts from 'vite-plugin-dts'
import { resolve } from 'path'

const repoName = 'vue-timeline-editor'

export default defineConfig(({ command, mode }) => {
  const isDemoBuild = command === 'build' && mode === 'demo'

  if (isDemoBuild) {
    return {
      base: `/${repoName}/`,
      plugins: [vue()],
      build: {
        outDir: 'dist-demo',
        emptyOutDir: true,
      },
    }
  }

  return {
    publicDir: false,
    plugins: [
      vue(),
      command === 'build'
        ? dts({
            tsconfigPath: './tsconfig.app.json',
            insertTypesEntry: true,
            include: [
              'src/index.ts',
              'src/interface/**/*.ts',
              'src/composables/**/*.ts',
              'src/utils/**/*.ts',
              'src/components/Timeline/**/*.vue',
            ],
            exclude: ['src/main.ts', 'src/App.vue', 'src/components/HelloWorld.vue'],
          })
        : null,
    ].filter(Boolean),
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'VueTimelineEditor',
        fileName: (format) => `vue-timeline-editor.${format}.js`,
        cssFileName: 'vue-timeline-editor',
      },
      rollupOptions: {
        external: ['vue'],
        output: {
          globals: {
            vue: 'Vue',
          },
        },
      },
    },
  }
})
