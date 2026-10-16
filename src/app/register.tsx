import { Link, router } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AutoCaresLogo from '../components/autocares-logo';
import { theme } from '../constants/autocares-theme';
import type { MechanicType, VehicleType } from '../lib/types';
import { useAuth, type SignUpRole } from '../providers/auth-provider';

const vehicleTypes: VehicleType[] = ['Bike', 'Car', 'Scooter', 'Van'];
const mechanicTypes: MechanicType[] = ['Car Mechanic', 'Bike Mechanic'];

const roles: { id: SignUpRole; title: string; description: string }[] = [
  {
    id: 'customer',
    title: 'Driver / Customer',
    description: 'Request roadside assistance, find nearby mechanics, and track repairs.',
  },
  {
    id: 'mechanic',
    title: 'Verified Mechanic',
    description: 'Accept local repair jobs, manage pricing, and earn on-demand.',
  },
];

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [cnicNumber, setCnicNumber] = useState('');
  const [yearsExperience, setYearsExperience] = useState('');
  const [mechanicType, setMechanicType] = useState<MechanicType | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [role, setRole] = useState<SignUpRole>('customer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleRegister() {
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !phone) {
      Alert.alert('Missing details', 'Fill in your first name, last name, email, and phone.');
      return;
    }

    if (!/^\d{11}$/.test(phone)) {
      Alert.alert('Invalid phone number', 'Enter a phone number with exactly 11 digits.');
      return;
    }

    if (role === 'mechanic') {
      if (!businessName.trim()) {
        Alert.alert('Business name required', 'Enter your business name.');
        return;
      }
      if (!/^\d{13}$/.test(cnicNumber)) {
        Alert.alert('Invalid CNIC', 'Enter your CNIC number using exactly 13 digits.');
        return;
      }
      if (
        yearsExperience &&
        (!/^\d+$/.test(yearsExperience) ||
          !Number.isSafeInteger(Number(yearsExperience)) ||
          Number(yearsExperience) > 2_147_483_647)
      ) {
        Alert.alert('Invalid experience', 'Enter years of experience as a valid whole number.');
        return;
      }
      if (!mechanicType) {
        Alert.alert('Mechanic type required', 'Select Car Mechanic or Bike Mechanic.');
        return;
      }
    }

    if (
      password.length < 8 ||
      !/[A-Z]/.test(password) ||
      !/\d/.test(password)
    ) {
      Alert.alert(
        'Weak password',
        'Use at least 8 characters, including at least one uppercase letter and one number.'
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Enter the same password in both password fields.');
      return;
    }

    if (role === 'customer' && !vehicleType) {
      Alert.alert('Vehicle required', 'Select your vehicle type.');
      return;
    }

    if (!acceptedTerms) {
      Alert.alert('Agreement required', 'Agree to the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsSubmitting(true);
    const { error, needsEmailConfirmation } = await signUp({
      email,
      password,
      firstName,
      lastName,
      phone,
      role,
      vehicleType: role === 'customer' ? vehicleType : null,
      businessName: role === 'mechanic' ? businessName.trim() : null,
      cnicNumber: role === 'mechanic' ? cnicNumber : null,
      yearsExperience: role === 'mechanic' ? Number(yearsExperience || 0) : null,
      mechanicType: role === 'mechanic' ? mechanicType : null,
    });
    setIsSubmitting(false);

    if (error) {
      Alert.alert('Registration failed', error);
      return;
    }

    if (needsEmailConfirmation) {
      Alert.alert(
        'Confirm your email',
        'Account created. Check your inbox to confirm your email, then log in.',
        [{ text: 'OK', onPress: () => router.replace('/login') }]
      );
      return;
    }

    router.replace('/');
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24) + 12,
            paddingBottom: Math.max(insets.bottom, 24) + 20,
          },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.cardContainer}>
          <View style={styles.logoWrapper}>
            <AutoCaresLogo size="lg" />
            <View style={styles.yellowBadge}>
              <Text style={styles.yellowBadgeText}>JOIN AUTOCARES</Text>
            </View>
          </View>

          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.description}>
            Register as a driver or certified mechanic to get started.
          </Text>

          {/* Role Selector */}
          <Text style={styles.sectionHeader}>Choose account type</Text>
          <View style={styles.rolesRow}>
            {roles.map((item) => {
              const selected = role === item.id;
              return (
                <Pressable
                  key={item.id}
                  style={[styles.roleCard, selected && styles.roleCardSelected]}
                  onPress={() => setRole(item.id)}
                  disabled={isSubmitting}>
                  <View style={styles.roleCardHeader}>
                    <Text style={[styles.roleTitle, selected && styles.roleTitleSelected]}>
                      {item.title}
                    </Text>
                    <View style={[styles.radioCircle, selected && styles.radioCircleSelected]}>
                      {selected && <View style={styles.radioDot} />}
                    </View>
                  </View>
                  <Text style={styles.roleDescription}>{item.description}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* Basic Details */}
          <View style={styles.row}>
            <View style={styles.halfField}>
              <Text style={styles.label}>First Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={theme.colors.muted}
                value={firstName}
                onChangeText={setFirstName}
                autoCapitalize="words"
                autoComplete="given-name"
                editable={!isSubmitting}
              />
            </View>
            <View style={styles.halfField}>
              <Text style={styles.label}>Last Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={theme.colors.muted}
                value={lastName}
                onChangeText={setLastName}
                autoCapitalize="words"
                autoComplete="family-name"
                editable={!isSubmitting}
              />
            </View>
          </View>

          <Text style={styles.label}>Email Address *</Text>
          <TextInput
            style={styles.input}
            placeholder="you@example.com"
            placeholderTextColor={theme.colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Phone Number * (11 digits)</Text>
          <TextInput
            style={styles.input}
            placeholder="03001234567"
            placeholderTextColor={theme.colors.muted}
            value={phone}
            onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 11))}
            keyboardType="number-pad"
            autoComplete="tel"
            maxLength={11}
            editable={!isSubmitting}
          />

          {/* Customer Specific: Vehicle Type */}
          {role === 'customer' && (
            <View style={styles.fieldSection}>
              <Text style={styles.label}>Primary Vehicle Type *</Text>
              <View style={styles.chipsRow}>
                {vehicleTypes.map((type) => {
                  const selected = vehicleType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setVehicleType(type)}
                      disabled={isSubmitting}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Mechanic Specific Details */}
          {role === 'mechanic' && (
            <View style={styles.mechanicSection}>
              <Text style={styles.label}>Workshop / Business Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Master Auto Works"
                placeholderTextColor={theme.colors.muted}
                value={businessName}
                onChangeText={setBusinessName}
                autoCapitalize="words"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>CNIC Number * (13 digits)</Text>
              <TextInput
                style={styles.input}
                placeholder="13-digit CNIC (without dashes)"
                placeholderTextColor={theme.colors.muted}
                value={cnicNumber}
                onChangeText={(value) => setCnicNumber(value.replace(/\D/g, '').slice(0, 13))}
                keyboardType="number-pad"
                maxLength={13}
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Years of Experience</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5"
                placeholderTextColor={theme.colors.muted}
                value={yearsExperience}
                onChangeText={(value) => setYearsExperience(value.replace(/\D/g, ''))}
                keyboardType="number-pad"
                editable={!isSubmitting}
              />

              <Text style={styles.label}>Mechanic Specialization *</Text>
              <View style={styles.chipsRow}>
                {mechanicTypes.map((type) => {
                  const selected = mechanicType === type;
                  return (
                    <Pressable
                      key={type}
                      style={[styles.chip, selected && styles.chipSelected]}
                      onPress={() => setMechanicType(type)}
                      disabled={isSubmitting}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}>
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {type}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          )}

          {/* Password fields */}
          <Text style={styles.label}>Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            placeholderTextColor={theme.colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />

          <Text style={styles.label}>Confirm Password *</Text>
          <TextInput
            style={styles.input}
            placeholder="Re-enter password"
            placeholderTextColor={theme.colors.muted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
            editable={!isSubmitting}
          />

          {/* Terms Agreement */}
          <Pressable
            style={styles.termsRow}
            onPress={() => setAcceptedTerms((accepted) => !accepted)}
            disabled={isSubmitting}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}>
            <View style={[styles.checkbox, acceptedTerms && styles.checkboxSelected]}>
              {acceptedTerms && <Text style={styles.checkboxCheck}>✓</Text>}
            </View>
            <Text style={styles.termsText}>
              I agree to AutoCares <Text style={styles.linkInline}>Terms of Service</Text> and{' '}
              <Text style={styles.linkInline}>Privacy Policy</Text>.
            </Text>
          </Pressable>

          {/* Primary Action Button (Sky Blue) */}
          <Pressable
            style={[styles.button, isSubmitting && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={isSubmitting}>
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.buttonText}>Complete Registration</Text>
            )}
          </Pressable>

          <View style={styles.footerRow}>
            <Text style={styles.bottomText}>Already registered? </Text>
            <Link href="/login" asChild>
              <Pressable>
                <Text style={styles.link}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 24,
    paddingVertical: 32,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
    ...theme.shadows.cardElevated,
  },
  logoWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  yellowBadge: {
    backgroundColor: theme.colors.yellowLight,
    borderColor: theme.colors.yellow,
    borderWidth: 1,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginTop: 8,
  },
  yellowBadgeText: {
    color: theme.colors.yellowText,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  title: {
    color: theme.colors.text,
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  description: {
    color: theme.colors.muted,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  sectionHeader: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  rolesRow: {
    gap: 10,
    marginBottom: 18,
  },
  roleCard: {
    padding: 14,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  roleCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  roleCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roleTitle: {
    color: theme.colors.text,
    fontSize: 15,
    fontWeight: '800',
  },
  roleTitleSelected: {
    color: theme.colors.primaryDark,
  },
  roleDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: theme.colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: theme.colors.primary,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfField: {
    flex: 1,
  },
  fieldSection: {
    marginBottom: 6,
  },
  mechanicSection: {
    marginBottom: 6,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    color: theme.colors.text,
    fontSize: 15,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: theme.radius.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  chipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  chipText: {
    color: theme.colors.text,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextSelected: {
    color: theme.colors.primaryDark,
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  checkbox: {
    width: 22,
    height: 22,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  checkboxSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary,
  },
  checkboxCheck: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  termsText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 18,
  },
  linkInline: {
    color: theme.colors.primaryDark,
    fontWeight: '700',
  },
  button: {
    backgroundColor: theme.colors.primary, // Sky Blue #38B8E8
    paddingVertical: 14,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
    ...theme.shadows.primaryButton,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 22,
  },
  bottomText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  link: {
    color: theme.colors.primaryDark,
    fontWeight: '800',
    fontSize: 14,
  },
});
