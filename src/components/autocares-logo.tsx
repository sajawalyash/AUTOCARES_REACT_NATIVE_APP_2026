import { Image, type ImageResizeMode, type ImageStyle, type StyleProp, StyleSheet } from 'react-native';

export type LogoSize = 'sm' | 'header' | 'md' | 'lg' | 'hero';

type AutoCaresLogoProps = {
  size?: LogoSize;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

// Original logo dimensions: 1346 x 768 (ratio: ~1.7526)
const LOGO_ASPECT_RATIO = 1346 / 768;

const SIZES: Record<LogoSize, { width: number; height: number }> = {
  sm: { height: 28, width: Math.round(28 * LOGO_ASPECT_RATIO) }, // 28 x 49
  header: { height: 40, width: Math.round(40 * LOGO_ASPECT_RATIO) }, // 40 x 70
  md: { height: 56, width: Math.round(56 * LOGO_ASPECT_RATIO) }, // 56 x 98
  lg: { height: 75, width: Math.round(75 * LOGO_ASPECT_RATIO) }, // 75 x 131
  hero: { height: 95, width: Math.round(95 * LOGO_ASPECT_RATIO) }, // 95 x 167
};

export default function AutoCaresLogo({
  size = 'md',
  style,
  resizeMode = 'contain',
}: AutoCaresLogoProps) {
  const presetStyle = SIZES[size];
  return (
    <Image
      source={require('../../assets/images/autocares-logo.png')}
      style={[styles.base, presetStyle, style]}
      resizeMode={resizeMode}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    aspectRatio: LOGO_ASPECT_RATIO,
    alignSelf: 'center',
  },
});
