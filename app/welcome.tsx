import { LinearGradient } from 'expo-linear-gradient';
import { Link } from 'expo-router';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import './global.css';

export default function WelcomeScreen() {
  return (
    <LinearGradient
      colors={['#1f2937', '#000000']} // gray-800 → black
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <View className="flex-1 justify-center items-center px-6">

          {/* Logo + Title */}
          <View className="w-full items-center mb-8">
            <Image
              source={require('../assets/images/inner_logo.png')}
              className="w-40 h-40 mb-10"
              resizeMode="contain"
            />
            <Text className="text-4xl font-extrabold mb-2 text-white">
              ChatterBridge
            </Text>
            <Text className="text-base mb-4 text-gray-300 text-center">
              Speak. See. Connect.
            </Text>
          </View>

          {/* CTA Button */}
          <Link
            href="/(tabs)/speech"
            className="rounded-xl py-3 px-7 bg-purple-600"
          >
            <Text className="text-lg font-extrabold text-white">
              Get Started
            </Text>
          </Link>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
