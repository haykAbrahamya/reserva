import { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Provider } from 'react-redux'
import { store } from '@/store'
import { useAppSelector } from '@/store/hooks'
import { Home } from '@/pages/Home/Home'
import { PartnerPage } from '@/pages/Partner/PartnerPage'
import { SignUp } from '@/pages/SignUp/SignUp'
import { NotFound } from '@/pages/NotFound/NotFound'

/** Reflects the persisted theme onto <html data-theme="…">. */
function ThemeApplier() {
  const theme = useAppSelector(s => s.theme.theme)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  return null
}

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <ThemeApplier />
        <Routes>
          <Route path="/" element={<Home />} />
          {/* Sign up / start free trial */}
          <Route path="/signup" element={<SignUp />} />
          {/* Partner booking page — reserva.am/p/:slug */}
          <Route path="/p/:slug" element={<PartnerPage />} />
          {/* Creative 404 for any unknown route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  )
}
