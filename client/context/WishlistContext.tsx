import type { Product, WishlistContextType } from '@/assets/constants/types'
import { createContext, type ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useAuth } from '@clerk/clerk-expo'
import axios from 'axios'
import Toast from 'react-native-toast-message'
import api from '../constants/api'

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)
export function WishlistProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth()
  const tokenRef = useRef(getToken)
  tokenRef.current = getToken
  const owner = useRef(userId)
  owner.current = userId
  const generation = useRef(0)
  const [wishlist, setWishlist] = useState<Product[]>([])
  const savedWishlist = useRef<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const queue = useRef<Promise<void>>(Promise.resolve())
  const pending = useRef(0)
  const toggles = useRef(new Map<string, Promise<void>>())

  const run = useCallback((product?: Product): Promise<void> => {
    if (!product && pending.current > 0) return queue.current
    const version = generation.current
    const current = () => owner.current === userId && generation.current === version
    pending.current++
    setLoading(true)
    const task = queue.current.then(async () => {
      if (!current()) return
      setError('')
      try {
        if (!isLoaded || !isSignedIn || !userId) throw new Error('Sign in to use your wishlist.')
        const token = await tokenRef.current()
        if (!current()) return
        if (!token) throw new Error('Please sign in again.')
        const config = { headers: { Authorization: 'Bearer ' + token } }
        const removing = !!product && savedWishlist.current.some(item => item._id === product._id)
        const response = !product ? await api.get('/wishlist', config)
          : removing
            ? await api.delete('/wishlist/' + encodeURIComponent(product._id), config)
            : await api.post('/wishlist/' + encodeURIComponent(product._id), {}, config)
        const { data } = response
        if (!data.success || !Array.isArray(data.data?.products)) throw new Error(data.message || 'Invalid wishlist response.')
        if (!current()) return
        // Deleted products may populate as null; only render actual products.
        const products: Product[] = data.data.products.filter((item: Product | null) => item && typeof item === 'object' && item._id)
        if (product && products.some(item => item._id === product._id) === removing) {
          throw new Error('The server did not confirm the wishlist change. Reload the app and restart the updated backend.')
        }
        savedWishlist.current = [...new Map(products.map(item => [item._id, item])).values()]
        setWishlist(savedWishlist.current)
      } catch (cause) {
        if (!current()) return
        const message = axios.isAxiosError(cause) ? cause.response?.data?.message || cause.message : cause instanceof Error ? cause.message : 'Wishlist request failed.'
        setError(message)
        if (product) Toast.show({ type: 'error', text1: 'Could not update wishlist', text2: message })
      } finally {
        if (current()) { pending.current--; setLoading(pending.current > 0) }
      }
    })
    queue.current = task.catch(() => {})
    return task
  }, [isLoaded, isSignedIn, userId])

  const refreshWishlist = useCallback(() => run(), [run])
  const toggleWishlist = useCallback((product: Product) => {
    const existing = toggles.current.get(product._id)
    if (existing) return existing
    const task = run(product).finally(() => {
      if (toggles.current.get(product._id) === task) toggles.current.delete(product._id)
    })
    toggles.current.set(product._id, task)
    return task
  }, [run])
  const isInWishlist = (productId: string) => wishlist.some(product => product._id === productId)
  useEffect(() => {
    generation.current++
    pending.current = 0
    queue.current = Promise.resolve()
    toggles.current.clear()
    savedWishlist.current = []
    setWishlist([])
    setError('')
    if (isLoaded && isSignedIn) void refreshWishlist()
    else setLoading(!isLoaded)
    return () => { generation.current++ }
  }, [isLoaded, isSignedIn, userId, refreshWishlist])

  return <WishlistContext.Provider value={{ wishlist, loading, error, refreshWishlist, isInWishlist, toggleWishlist }}>{children}</WishlistContext.Provider>
}
export function useWishlist() {
  const context = useContext(WishlistContext)
  if (context === undefined) throw new Error('useWishlist must be used within a WishlistProvider')
  return context
}
