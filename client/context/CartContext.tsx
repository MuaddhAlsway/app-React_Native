import { dummyCart } from '@/assets/assets'
import { Product } from '@/assets/constants/types'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from 'react'

export type CartItem = {
  id: string
  productId: string
  product: Product
  quantity: number
  size: string
  price: number
}

type CartContextType = {
  cartItem: CartItem[]
  addToCart: (product: Product, size: string) => Promise<void>
  removeFromCart: (itemId: string, size: string) => void
  updateQuantity: (itemId: string, quantity: number, size: string) => void
  clearCart: () => Promise<void>
  cartTotal: number
  itemCount: number
  isLoading: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartItem, setCartItem] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const fetchCart = async () => {
    setIsLoading(true)

    const serverCart = dummyCart
    const mappedItems: CartItem[] = serverCart.items.map((item: any) => ({
      id: `${item.product._id}-${item.size || 'M'}`,
      productId: item.product._id,
      product: item.product,
      quantity: item.quantity,
      size: item.size || 'M',
      price: item.price,
    }))

    setCartItem(mappedItems)
    setIsLoading(false)
  }

  const addToCart = async (product: Product, size: string) => {
    setCartItem((prev) => {
      const exists = prev.find(
        (item) => item.productId === product._id && item.size === size,
      )

      if (exists) {
        return prev.map((item) =>
          item.productId === product._id && item.size === size
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...prev,
        {
          id: `${product._id}-${size}`,
          productId: product._id,
          product,
          quantity: 1,
          size,
          price: product.price,
        },
      ]
    })
  }

  const removeFromCart = (itemId: string, size: string) => {
    setCartItem((prev) =>
      prev.filter(
        (item) => !(item.productId === itemId && item.size === size),
      ),
    )
  }

  const updateQuantity = (itemId: string, quantity: number, size: string) => {
    setCartItem((prev) =>
      prev.map((item) =>
        item.productId === itemId && item.size === size
          ? { ...item, quantity: Math.max(1, quantity) }
          : item,
      ),
    )
  }

  const clearCart = async () => {
    setCartItem([])
  }

  const cartTotal = cartItem.reduce(
    (total, item) => total + item.price * item.quantity,
    0,
  )

  const itemCount = cartItem.reduce(
    (total, item) => total + item.quantity,
    0,
  )

  useEffect(() => {
    fetchCart()
  }, [])

  return (
    <CartContext.Provider
      value={{
        cartItem,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartTotal,
        itemCount,
        isLoading,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)

  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }

  return context
}