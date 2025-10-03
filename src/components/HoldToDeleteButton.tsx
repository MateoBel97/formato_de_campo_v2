import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Platform,
  Vibration,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { COLORS } from '../constants';

interface HoldToDeleteButtonProps {
  onDeleteComplete: () => void;
  duration?: number;
  size?: number;
  color?: string;
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const HoldToDeleteButton: React.FC<HoldToDeleteButtonProps> = ({
  onDeleteComplete,
  duration = 3000,
  size = 120,
  color = COLORS.error,
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);

  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;

  const handlePressIn = () => {
    setIsPressed(true);

    // Start animation
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    });

    animationRef.current.start(({ finished }) => {
      if (finished) {
        // Delete completed
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          Vibration.vibrate(50);
        }
        onDeleteComplete();
      }
    });
  };

  const handlePressOut = () => {
    setIsPressed(false);

    // Cancel animation and reset
    if (animationRef.current) {
      animationRef.current.stop();
    }

    Animated.timing(progressAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  // Interpolate progress to stroke dash offset
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  });

  // Interpolate progress to opacity
  const fillOpacity = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.1, 0.3],
  });

  return (
    <TouchableWithoutFeedback
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <View style={[styles.container, { width: size, height: size }]}>
        {/* Background circle */}
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: color + '15',
            },
          ]}
        />

        {/* Progress circle (SVG) */}
        <Svg
          width={size}
          height={size}
          style={styles.svg}
        >
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="4"
            fill={color}
            fillOpacity={fillOpacity}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            rotation="-90"
            originX={size / 2}
            originY={size / 2}
          />
        </Svg>

        {/* Icon */}
        <View style={styles.iconContainer}>
          <Feather
            name="trash-2"
            size={size / 3}
            color={isPressed ? COLORS.surface : color}
          />
        </View>

        {/* Instruction text */}
        <Text style={[styles.instructionText, { color }]}>
          {isPressed ? 'Mantén...' : 'Mantén presionado'}
        </Text>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
  },
  svg: {
    position: 'absolute',
  },
  iconContainer: {
    zIndex: 2,
  },
  instructionText: {
    position: 'absolute',
    bottom: -24,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default HoldToDeleteButton;
