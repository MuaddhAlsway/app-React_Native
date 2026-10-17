import { ProductCardProps } from '@/assets/constants/types'
import { COLORS } from '../assets/constants'
import { Ionicons } from '@expo/vector-icons'
import { Link } from 'expo-router'
import { Image, View, TouchableOpacity,Text } from 'react-native'

const ProductCard = ({ product }: ProductCardProps) => {


    const isLiked = false
  return (
    <Link href={`/product/${product._id}`} asChild>
      <TouchableOpacity className="mb-4 w-[48%] overflow-hidden rounded-lg bg-white">
        <View className="relative h-56 w-full bg-gray-100">
          <Image
            source={{ uri: product.images?.[0] ?? '' }}
            className="h-full w-full"
            resizeMode="cover"
          />
          {/* Faviourte icon */}
          <TouchableOpacity className='absolute top-2 right-2 z-10 p-2 bg-white rounded-full shadow-sm' onPress={(e)=> {e.stopPropagation();}}>
                 <Ionicons name={isLiked ? 'heart': 'heart-outline'} size={20} color={isLiked ? COLORS.accent : COLORS.primary}/>
          </TouchableOpacity>
         
            {/* IS FEATURED */}
            {product.isFeatured && (
                <View className='absolute top-2 left-2 bg-black px-2 py-1 rounded'>
                    <Text  className="text-white text-xs font-bold uppercase">
                        Featured
                    </Text>
                </View>
            )}
        </View>


        {/* product info */}
        <View className='p-3'> 
                <View className='flex-row items-center mb-1'>
                    <Ionicons name='star' size={14} color='#FFD700' />
                    <Text  className='text-secondary text-xs ml-1'>
                            4.6
                    </Text>
                </View>

               <Text className='text-primary font-medium text-sm mb-1' numberOfLines={1}>{product.name}</Text>
               <View className='flex-row items-center'>
                <Text className='text-primary font-bold text-base'>${product.price.toFixed(2)}</Text>
               </View>
        </View>

      </TouchableOpacity>
    </Link>
  )
}

export default ProductCard