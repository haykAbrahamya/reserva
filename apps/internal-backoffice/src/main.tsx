import { createRoot } from 'react-dom/client'
import '@reserva/ui/styles'
import './theme-overrides.css' // must follow ui/styles so it overrides the shared tokens
import { disableNumberInputStepping } from '@reserva/ui'
import App from './App'

// Number fields change by typing only — scrolling a form must never change a value.
disableNumberInputStepping()

createRoot(document.getElementById('root')!).render(<App />)
