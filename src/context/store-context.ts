import { createContext } from 'react'

export type Theme = 'gallery' | 'vintage'
export type CartLine = { slug: string; qty: number }

export type Store = {
  theme: Theme
  toggleTheme: () => void
  cart: CartLine[]
  wishlist: string[]
  addToCart: (slug: string) => void
  updateQty: (slug: string, qty: number) => void
  removeFromCart: (slug: string) => void
  clearCart: () => void
  toggleWishlist: (slug: string) => void
  inWishlist: (slug: string) => boolean
  cartCount: number
  wishlistCount: number
}

export const StoreContext = createContext<Store | null>(null)
