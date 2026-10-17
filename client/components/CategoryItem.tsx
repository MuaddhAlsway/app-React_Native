import { CategoryItemProps } from '@/assets/constants/types'
import { COLORS } from '../assets/constants'
import { Ionicons } from '@expo/vector-icons'
import { View, Text, TouchableOpacity } from 'react-native'

export default function CategoryItem({
  item,
  isSelected,
  onPress,
}: CategoryItemProps) {
  return (
    <TouchableOpacity className="mr-4 items-center" onPress={onPress}>
      <View
        className={`mb-2 h-14 w-14 items-center justify-center rounded-full ${
          isSelected ? 'bg-primary' : 'bg-surface'
        }`}
      >
        <Ionicons
          name={item.icon as any}
          size={24}
          color={isSelected ? '#FFF' : COLORS.primary}
        />
      </View>

      <Text
        className={`text-xs font-medium ${
          isSelected ? 'text-primary' : 'text-secondary'
        }`}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  )
}