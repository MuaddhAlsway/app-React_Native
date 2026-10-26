import type { Product } from '@/assets/constants/types'
import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import api from '../constants/api'

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
  removeFromCart: (productId: string, size: string) => Promise<void>
  updateQuantity: (productId: string, quantity: number, size: string) => Promise<void>
  clearCart: () => Promise<void>
  refreshCart: () => Promise<void>
  cartTotal: number
  itemCount: number
  isLoading: boolean
  error: string
}
const CartContext = createContext<CartContextType | undefined>(undefined)

// Missing populated products can occur after a product is deleted.
function mapCart(cart: { items?: any[] }): CartItem[] {
  if (!Array.isArray(cart?.items)) throw new Error('Invalid cart response.')
  return cart.items.filter(item => item.product && typeof item.product === 'object' && item.product._id).map(item => ({
    id: item._id || `${item.product._id}-${item.size || ''}`,
    productId: item.product._id,
    product: item.product,
    quantity: item.quantity,
    size: item.size || '',
    price: item.price,
  }))
}
export function CartProvider({ children }: { children: ReactNode }) {
  const { getToken, userId, isLoaded, isSignedIn } = useAuth()
  const [cartItem, setCartItem] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const session = useRef(userId)
  session.current = userId
  const generation = useRef(0)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(0)

  function run(action?: (headers: { Authorization: string }) => Promise<unknown>): Promise<void> {
    const owner = userId
    const version = generation.current
    pending.current++
    setIsLoading(true)
    const current = () => session.current === owner && generation.current === version
    const task = queue.current.then(async () => {
      if (!current()) return
      setError('')
      try {
        if (!isLoaded || !isSignedIn || !owner) throw new Error('Sign in to use your cart.')
        const token = await getToken()
        if (!current()) return
        if (!token) throw new Error('Please sign in again.')
        const headers = { Authorization: `Bearer ${token}` }
        if (action) {
          const response: any = await action(headers)
          if (!response.data?.success) throw new Error(response.data?.message || 'Could not update cart.')
        }
        if (!current()) return
        const { data } = await api.get('/cart', { headers })
        if (!data.success) throw new Error(data.message || 'Could not load cart.')
        if (current()) setCartItem(mapCart(data.data))
      } catch (cause) {
        if (!current()) return
        const message = axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : cause instanceof Error ? cause.message : 'Could not update cart.'
        setError(message)
        Toast.show({ type: 'error', text1: 'Cart request failed', text2: message })
      } finally {
        if (current()) {
          pending.current--
          setIsLoading(pending.current > 0)
        }
      }
    })
    queue.current = task.catch(() => {})
    return task
  }

  const refreshCart = () => run()
  const addToCart = (product: Product, size: string) => run(headers => api.post('/cart/add', { productId: product._id, size, quantity: 1 }, { headers }))
  const removeFromCart = (productId: string, size: string) => run(headers => api.delete('/cart/item/' + encodeURIComponent(productId), { headers, data: { size } }))
  const updateQuantity = (productId: string, quantity: number, size: string) => {
    if (!Number.isInteger(quantity) || quantity < 1) return Promise.resolve()
    return run(headers => api.put('/cart/item/' + encodeURIComponent(productId), { size, quantity }, { headers }))
  }
  const clearCart = () => run(headers => api.delete('/cart', { headers }))

  useEffect(() => {
    generation.current++
    pending.current = 0
    queue.current = Promise.resolve()
    setCartItem([])
    setError('')
    if (isLoaded && isSignedIn) void refreshCart()
    else setIsLoading(!isLoaded)
    return () => { generation.current++ }
  }, [isLoaded, isSignedIn, userId])

  const cartTotal = cartItem.reduce((total, item) => total + item.price * item.quantity, 0)
  const itemCount = cartItem.reduce((total, item) => total + item.quantity, 0)
  return <CartContext.Provider value={{ cartItem, addToCart, removeFromCart, updateQuantity, clearCart, refreshCart, cartTotal, itemCount, isLoading, error }}>{children}</CartContext.Provider>
}
export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) throw new Error('useCart must be used within a CartProvider')
  return context
}
