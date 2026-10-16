import { Image, type ImageResizeMode, type ImageStyle, type StyleProp, StyleSheet, View } from 'react-native';

export type LogoSize = 'sm' | 'header' | 'md' | 'lg' | 'hero';

type AutoCaresLogoProps = {
  size?: LogoSize;
  style?: StyleProp<ImageStyle>;
  resizeMode?: ImageResizeMode;
};

// Original logo dimensions: 1346 x 768 (ratio: ~1.7526)
const LOGO_ASPECT_RATIO = 1346 / 768;

const SIZES: Record<LogoSize, { width: number; height: number }> = {
  sm: { height: 26, width: Math.round(26 * LOGO_ASPECT_RATIO) }, // 26 x 46
  header: { height: 36, width: Math.round(36 * LOGO_ASPECT_RATIO) }, // 36 x 63
  md: { height: 48, width: Math.round(48 * LOGO_ASPECT_RATIO) }, // 48 x 84
  lg: { height: 68, width: Math.round(68 * LOGO_ASPECT_RATIO) }, // 68 x 119
  hero: { height: 84, width: Math.round(84 * LOGO_ASPECT_RATIO) }, // 84 x 147
};

export default function AutoCaresLogo({
  size = 'md',
  style,
  resizeMode = 'contain',
}: AutoCaresLogoProps) {
  const presetStyle = SIZES[size];
  return (
    <View style={styles.wrapper}>
      <Image
        source={require('../../assets/images/autocares-logo.png')}
        style={[styles.base, presetStyle, style]}
        resizeMode={resizeMode}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  base: {
    aspectRatio: LOGO_ASPECT_RATIO,
    alignSelf: 'center',
  },
});
