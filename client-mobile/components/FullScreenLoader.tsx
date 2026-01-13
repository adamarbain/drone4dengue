import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Image, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

type FullScreenLoaderProps = {
  title?: string;
  subtitle?: string;
};

export default function FullScreenLoader({
  title = 'Loading your experience...',
  subtitle = 'Preparing the latest dengue insights and maps for you',
}: FullScreenLoaderProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Simple fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();

    // Simple loading dots animation
    const animateDot = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0.3,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      animateDot(dotAnim1, 0),
      animateDot(dotAnim2, 200),
      animateDot(dotAnim3, 400),
    ]).start();
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0F2854', '#1C4D8D', '#3BAFDA']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={[]}>
          <View style={styles.mainContent}>
            <Animated.View style={[styles.contentWrapper, { opacity: fadeAnim }]}>
              {/* Logo */}
              <View style={styles.logoContainer}>
                <Image
                  source={require('../assets/dengueeye_logo.png')}
                  style={styles.logo}
                />
              </View>

              {/* App Name */}
              <Text style={styles.appName}>DengueEye</Text>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Description */}
              <Text style={styles.description}>{subtitle}</Text>

              {/* Simple loading dots */}
              <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
                <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
                <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
              </View>
            </Animated.View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  contentWrapper: {
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    marginBottom: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  appName: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 40,
    paddingHorizontal: 20,
    textAlign: 'center',
    maxWidth: 300,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
});
