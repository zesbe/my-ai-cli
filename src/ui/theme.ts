// UI Theme Definitions
export interface Theme {
  name: string;
  colors: {
    primary: string;    // Main command/highlight (Cyan default)
    secondary: string;  // Accents (Magenta default)
    success: string;    // Success/Check (Green)
    error: string;      // Error/Fail (Red)
    warning: string;    // Warning/Running (Yellow)
    dim: string;        // Dimmed text (Gray)
    text: string;       // Main text (White)
    border: string;     // Border color
  };
  icons: {
    prefix: string;     // Prompt prefix
    ai: string;         // AI avatar
    user: string;       // User avatar
    tool: string;       // Tool icon
  };
}

export const THEMES: Record<string, Theme> = {
  zesbe: {
    name: 'Zesbe Default',
    colors: {
      primary: 'cyan',
      secondary: 'magenta',
      success: 'green',
      error: 'red',
      warning: 'yellow',
      dim: 'gray',
      text: 'white',
      border: 'cyan'
    },
    icons: {
      prefix: '❯',
      ai: '🤖',
      user: '👤',
      tool: '🔧'
    }
  },
  claude: {
    name: 'Claude Professional',
    colors: {
      primary: '#D97757', // Claude-ish Orange/Brown
      secondary: '#6B685F', // Warm Gray
      success: '#5A8E6A', // Muted Green
      error: '#C2584D',   // Muted Red
      warning: '#D4A657', // Muted Yellow
      dim: '#8E8B82',
      text: '#E3E1D9',
      border: '#6B685F'
    },
    icons: {
      prefix: '●',
      ai: '🧠',
      user: 'me',
      tool: '⚡'
    }
  },
  matrix: {
    name: 'The Matrix',
    colors: {
      primary: 'green',
      secondary: 'green',
      success: 'green',
      error: 'red',
      warning: 'yellow',
      dim: 'gray',
      text: 'green',
      border: 'green'
    },
    icons: {
      prefix: '>',
      ai: '💻',
      user: '⌨️',
      tool: '⚙️'
    }
  },
  cyberpunk: {
    name: 'Cyberpunk',
    colors: {
      primary: '#F0F',    // Neon Pink
      secondary: '#0FF',  // Cyan
      success: '#0F0',    // Lime
      error: '#F00',      // Red
      warning: '#FF0',    // Yellow
      dim: '#555',
      text: '#FFF',
      border: '#F0F'
    },
    icons: {
      prefix: '⚡',
      ai: '👾',
      user: '💀',
      tool: '🦾'
    }
  }
};

export const DEFAULT_THEME = 'zesbe';
