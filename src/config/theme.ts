import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    colorPrimary: '#FFB347',
    borderRadius: 16,
    fontSize: 14,
    colorSuccess: '#6FCF97',
    colorWarning: '#F4A261',
    colorError: '#E66767',
    colorInfo: '#5D9BEC',
    fontFamily: "'Quicksand', 'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
  },
  components: {
    Button: {
      controlHeight: 44,
      fontWeight: 600,
      paddingInline: 24,
      borderRadius: 24,
    },
    Input: {
      controlHeight: 44,
    },
    Card: {
      borderRadiusLG: 24,
    },
  },
};
