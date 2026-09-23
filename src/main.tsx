import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RootShell } from './shell/RootShell'
import OrderConfirmationDeployment from './apps/one-flows/OrderConfirmationDeployment'
import '@tokens/index.css'

const SupermallApp    = lazy(() => import('./apps/supermall/App'))
const ShareAddressApp = lazy(() => import('./apps/share-address/App'))
const OneFlowsApp     = lazy(() => import('./apps/one-flows/App'))
const WishlistApp     = lazy(() => import('./apps/wishlist/App'))
const Hub             = lazy(() => import('./shell/Hub'))

const queryClient = new QueryClient()

const orderConfirmationOnly =
  import.meta.env.VITE_ORDER_CONFIRMATION_ONLY === 'true'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {orderConfirmationOnly ? (
      <OrderConfirmationDeployment />
    ) : (
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <RootShell>
            <Suspense fallback={null}>
              <Routes>
                <Route path="/supermall/*"     element={<SupermallApp />} />
                <Route path="/share-address/*" element={<ShareAddressApp />} />
                <Route path="/one-flows/*"     element={<OneFlowsApp />} />
                <Route path="/wishlist/*"      element={<WishlistApp />} />
                <Route path="/"                element={<Navigate to="/supermall" replace />} />
              </Routes>
            </Suspense>
          </RootShell>
        </BrowserRouter>
      </QueryClientProvider>
    )}
  </StrictMode>,
)
