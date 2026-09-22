import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from '@/components/layout/Layout'
import { LegalPage } from '@/pages/LegalPage'

const HomePage = lazy(() => import('@/pages/HomePage').then((m) => ({ default: m.HomePage })))
const ShopPage = lazy(() => import('@/pages/ShopPage').then((m) => ({ default: m.ShopPage })))
const ProductPage = lazy(() => import('@/pages/ProductPage').then((m) => ({ default: m.ProductPage })))
const GalleryPage = lazy(() => import('@/pages/GalleryPage').then((m) => ({ default: m.GalleryPage })))
const GalleryWorkPage = lazy(() => import('@/pages/GalleryWorkPage').then((m) => ({ default: m.GalleryWorkPage })))
const CollectionsPage = lazy(() => import('@/pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage })))
const CollectionPage = lazy(() => import('@/pages/CollectionPage').then((m) => ({ default: m.CollectionPage })))
const AboutPage = lazy(() => import('@/pages/AboutPage').then((m) => ({ default: m.AboutPage })))
const JournalPage = lazy(() => import('@/pages/JournalPage').then((m) => ({ default: m.JournalPage })))
const ArticlePage = lazy(() => import('@/pages/ArticlePage').then((m) => ({ default: m.ArticlePage })))
const CommissionsPage = lazy(() => import('@/pages/CommissionsPage').then((m) => ({ default: m.CommissionsPage })))
const ContactPage = lazy(() => import('@/pages/ContactPage').then((m) => ({ default: m.ContactPage })))
const CartPage = lazy(() => import('@/pages/CartPage').then((m) => ({ default: m.CartPage })))
const WishlistPage = lazy(() => import('@/pages/WishlistPage').then((m) => ({ default: m.WishlistPage })))
const SearchPage = lazy(() => import('@/pages/SearchPage').then((m) => ({ default: m.SearchPage })))
const DataDeletionPage = lazy(() => import('@/pages/DataDeletionPage').then((m) => ({ default: m.DataDeletionPage })))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })))

function Fallback() {
  return (
    <div className="not-found" role="status">
      <p className="logo">ARIPAN</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/gallery/:slug" element={<GalleryWorkPage />} />
            <Route path="/collections" element={<CollectionsPage />} />
            <Route path="/collections/:slug" element={<CollectionPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/journal/:slug" element={<ArticlePage />} />
            <Route path="/commissions" element={<CommissionsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/privacy" element={<LegalPage page="privacy" />} />
            <Route path="/terms" element={<LegalPage page="terms" />} />
            <Route path="/refunds" element={<LegalPage page="refunds" />} />
            <Route path="/shipping" element={<LegalPage page="shipping" />} />
            <Route path="/cookies" element={<LegalPage page="cookies" />} />
            <Route path="/data-deletion" element={<DataDeletionPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
