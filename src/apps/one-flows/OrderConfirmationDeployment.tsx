import { useState } from 'react'
import SmoothCorners from '@ui/SmoothCorners'
import OrderConfirmationPage, {
  OrderConfirmationSkeleton,
  VariantSwitch,
  parseWidgetVariant,
  type WidgetVariant,
} from './components/OrderConfirmationPage'
import { SkeletonGate } from './components/Skeleton'
import './index.css'

export default function OrderConfirmationDeployment() {
  const [variant, setVariant] = useState<WidgetVariant>(() =>
    parseWidgetVariant(new URLSearchParams(window.location.search).get('v')),
  )

  const switchVariant = (next: WidgetVariant) => {
    setVariant(next)
    const url = new URL(window.location.href)
    if (next === 1) url.searchParams.delete('v')
    else url.searchParams.set('v', String(next))
    window.history.replaceState(window.history.state, '', url)
  }

  return (
    <div className="min-h-screen min-h-dvh w-full flex flex-col items-center justify-center gap-4">
      <SmoothCorners radius={20}>
        <div className="relative w-[375px] h-[812px] overflow-hidden">
          <SkeletonGate skeleton={<OrderConfirmationSkeleton variant={variant} />}>
            <OrderConfirmationPage
              onBack={() => undefined}
              onContinueShopping={() => undefined}
              variant={variant}
            />
          </SkeletonGate>
        </div>
      </SmoothCorners>
      <VariantSwitch value={variant} onChange={switchVariant} />
    </div>
  )
}
