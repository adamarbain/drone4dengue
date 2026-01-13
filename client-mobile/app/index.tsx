import { Text, View, Image, Animated, Easing, StyleSheet, Dimensions } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.2)).current;

  // Memoize particle data
  const particleData = useMemo(() => 
    Array.from({ length: 12 }, (_, i) => ({
      id: i,
      size: 2 + Math.random() * 4,
      startX: Math.random() * SCREEN_WIDTH,
      startY: Math.random() * SCREEN_HEIGHT,
      deltaX: Math.random() * 50 - 25,
      deltaY: Math.random() * 40 + 15,
      duration: (Math.random() * 10 + 15) * 1000,
    })), []
  );

  const particleAnims = useRef(
    particleData.map(() => ({
      translateX: new Animated.Value(0),
      translateY: new Animated.Value(0),
      opacity: new Animated.Value(0.1 + Math.random() * 0.2),
    }))
  ).current;

  useEffect(() => {
    // Entry animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.5,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.2,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Particle animations
    particleAnims.forEach((particle, index) => {
      const data = particleData[index];
      
      Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(particle.translateX, {
              toValue: data.deltaX,
              duration: data.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: -data.deltaY,
              duration: data.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.4,
                duration: data.duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.1,
                duration: data.duration / 2,
                useNativeDriver: true,
              }),
            ]),
          ]),
          Animated.parallel([
            Animated.timing(particle.translateX, {
              toValue: -data.deltaX,
              duration: data.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.timing(particle.translateY, {
              toValue: data.deltaY,
              duration: data.duration,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true,
            }),
            Animated.sequence([
              Animated.timing(particle.opacity, {
                toValue: 0.4,
                duration: data.duration / 2,
                useNativeDriver: true,
              }),
              Animated.timing(particle.opacity, {
                toValue: 0.1,
                duration: data.duration / 2,
                useNativeDriver: true,
              }),
            ]),
          ]),
        ])
      ).start();
    });
  }, []);

  useEffect(() => {
    let timer: number;
    
    const checkAuthAndRedirect = async () => {
      // Check if user is already authenticated
      const token = await AsyncStorage.getItem('token');
      const tokenExp = await AsyncStorage.getItem('token_exp');
      
      let isAuthenticated = false;
      if (token && tokenExp) {
        const now = Date.now();
        const expTime = parseInt(tokenExp, 10);
        if (now < expTime) {
          isAuthenticated = true;
        }
      }
      
      timer = setTimeout(() => {
        if (isAuthenticated) {
          console.log('[INDEX] User is authenticated, redirecting to dashboard');
          router.replace('/dashboard');
        } else {
          console.log('[INDEX] User not authenticated, redirecting to login');
          router.replace('/(auth)/login');
        }
      }, 5000); // 5 seconds
    };
    
    checkAuthAndRedirect();
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [router]);

  return (
    <>
      <StatusBar style="light" />
      <LinearGradient
        colors={['#0A1628', '#0F2854', '#1C4D8D', '#2E7BC4']}
        locations={[0, 0.3, 0.6, 1]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea} edges={[]}>
          {/* Floating particles */}
          <View style={styles.particleContainer}>
            {particleAnims.map((particle, i) => (
              <Animated.View
                key={particleData[i].id}
                style={[
                  styles.particle,
                  {
                    width: particleData[i].size,
                    height: particleData[i].size,
                    left: particleData[i].startX,
                    top: particleData[i].startY,
                    opacity: particle.opacity,
                    transform: [
                      { translateX: particle.translateX },
                      { translateY: particle.translateY },
                    ],
                  },
                ]}
              />
            ))}
          </View>

          {/* Main content */}
          <Animated.View
            style={[
              styles.content,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Glow effect behind logo */}
            <Animated.View style={[styles.glow, { opacity: glowAnim }]} />

            {/* Logo with pulse */}
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.12)', 'rgba(255, 255, 255, 0.04)']}
                style={styles.logoContainer}
              >
                <Image
                  source={require('../assets/dengueeye_logo.png')}
                  style={styles.logo}
                />
              </LinearGradient>
            </Animated.View>

            {/* App name */}
            <Text style={styles.title}>DengueEye</Text>

            {/* Tagline */}
            <Text style={styles.tagline}>Protecting Communities Together</Text>

            {/* Decorative underline */}
            <LinearGradient
              colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.underline}
            />
          </Animated.View>
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 175, 218, 0.35)',
    top: -20,
  },
  logoContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 46,
    fontWeight: '800',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 6,
    letterSpacing: 1,
    marginBottom: 8,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 16,
  },
  underline: {
    width: 100,
    height: 3,
    borderRadius: 2,
  },
});
