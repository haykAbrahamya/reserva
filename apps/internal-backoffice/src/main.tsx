import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import './theme-overrides.css' // must follow ui/styles so it overrides the shared tokens
import App from './App'

createRoot(document.getElementById('root')!).render(<App />)
