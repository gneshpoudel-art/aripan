import type { Product } from '@/data/catalog'
import type { CartLine } from '@/context/store-context'

export function cartProducts(cart: CartLine[], catalog: Product[]) {
  return cart
    .map((line) => {
      const product = catalog.find((p) => p.slug === line.slug)
      return product ? { product, qty: line.qty } : null
    })
    .filter((x): x is { product: Product; qty: number } => Boolean(x))
}
