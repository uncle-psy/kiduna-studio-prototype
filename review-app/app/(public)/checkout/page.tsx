import type { Metadata } from 'next'
import DunaLandingNav from '@/components/landing/DunaLandingNav'
import LandingFooter from '@/components/landing/LandingFooter'
import CheckoutView from '@/components/landing/CheckoutView'
import '../dunathon-landing.css'

export const metadata: Metadata = {
  title: 'Become a Co-founder — WV DUNA',
  description:
    'Complete your $100 USD contribution to become a Co-founder of Kinship DUNA (the Genesis Kiduna) and enter the DUNAVERSE.',
}

export default function CheckoutPage() {
  return (
    <>
      <div className="duna-landing" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
        <DunaLandingNav />
      </div>
      <CheckoutView />
      <LandingFooter />
    </>
  )
}
