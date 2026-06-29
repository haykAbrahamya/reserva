import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'reserva-client-theme'

function loadTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'dark' || saved === 'light' ? saved : 'dark'
}

interface ThemeState {
  theme: Theme
}

const initialState: ThemeState = {
  theme: loadTheme(),
}

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload
      window.localStorage.setItem(STORAGE_KEY, action.payload)
    },
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark'
      window.localStorage.setItem(STORAGE_KEY, state.theme)
    },
  },
})

export const { setTheme, toggleTheme } = themeSlice.actions
export default themeSlice.reducer
