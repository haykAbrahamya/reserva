import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Megaphone, ShieldCheck, Users } from 'lucide-react'
import { AccountChoice, rememberedRole, type AccountRole } from '@/components/auth/AccountChoice/AccountChoice'
import { AuthLayout } from '@/components/auth/AuthLayout/AuthLayout'
import { useT } from '@/i18n'
import { useSeo } from '@/lib/useSeo'
import { SalonSignUp } from './SalonSignUp'
import { SpecialistSignUp } from './SpecialistSignUp'

/**
 * Signup, for both sides of the market.
 *
 * This file is a FORK and nothing else: it asks which side you are on and hands
 * over to the form for that side. The two forms have almost nothing in common —
 * one creates an organization with staff and a backoffice login, the other
 * creates a person with a phone number and a trade — so trying to serve both
 * from one component would produce a form that is half wrong for everybody.
 *
 * The last choice is remembered, so a returning visitor lands on their own form
 * rather than answering the same question again. It only decides which panel
 * opens first; the way back is always on screen.
 */
export function SignUp() {
  const t = useT()
  /*
   * `?as=salon` opens salon registration directly.
   *
   * For links that already know the answer — the footer's "post a listing", the
   * sign-in page's salon door. Asking someone who just clicked "post a listing"
   * whether they are hiring is asking them to repeat themselves.
   *
   * It also beats the remembered choice on purpose: an explicit link is a
   * statement about THIS visit, and letting a stale preference override it
   * would send a salon into the specialist form from a button that said the
   * opposite.
   */
  const [params] = useSearchParams()
  const asked = params.get('as')
  const forced: AccountRole | null =
    asked === 'salon' || asked === 'specialist' ? asked : null

  const [role, setRole] = useState<AccountRole | null>(forced ?? rememberedRole)

  useSeo({
    title: t('signup.seoTitle'),
    description: t('signup.seoDescription'),
    canonicalPath: '/signup/',
  })

  const points = [
    { icon: Megaphone, title: t('signup.points.reach.title'), desc: t('signup.points.reach.desc') },
    { icon: Users, title: t('signup.points.applicants.title'), desc: t('signup.points.applicants.desc') },
    { icon: ShieldCheck, title: t('signup.points.free.title'), desc: t('signup.points.free.desc') },
  ]

  return (
    <AuthLayout panelTitle={t('signup.panelTitle')} points={points}>
      {role === 'salon' ? (
        <SalonSignUp onBack={() => setRole(null)} />
      ) : role === 'specialist' ? (
        <SpecialistSignUp onBack={() => setRole(null)} />
      ) : (
        <AccountChoice mode="signup" onChoose={setRole} />
      )}
    </AuthLayout>
  )
}
