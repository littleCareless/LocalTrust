import { useDark, useToggle } from '@vueuse/core'

/**
 * 主题切换 Composable
 */
export function useTheme() {
  // 使用 VueUse 的 useDark 自动管理暗黑模式
  const isDark = useDark({
    selector: 'html',
    attribute: 'class',
    valueDark: 'dark',
    valueLight: 'light',
    storageKey: 'localtrust-theme',
    storage: localStorage,
    onChanged(dark: boolean) {
      // 确保主题切换时正确更新 class
      const html = document.documentElement
      if (dark) {
        html.classList.remove('light')
        html.classList.add('dark')
      } else {
        html.classList.remove('dark')
        html.classList.add('light')
      }
    }
  })

  const toggle = useToggle(isDark)

  // 包装 toggle 函数以匹配事件处理器的签名
  const toggleTheme = () => {
    toggle()
  }

  return {
    isDark,
    toggleTheme
  }
}
