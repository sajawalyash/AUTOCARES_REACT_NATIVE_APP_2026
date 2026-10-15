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

import AutoCaresLogo from '../components/autocares-logo';
import { theme } from '../constants/autocares-theme';
import type { MechanicType, VehicleType } from '../lib/types';
import { useAuth, type SignUpRole } from '../providers/auth-provider';

const vehicleTypes: VehicleType[] = ['Bike', 'Car', 'Scooter', 'Van'];
const mechanicTypes: MechanicType[] = ['Car Mechanic', 'Bike Mechanic'];

const roles: { id: SignUpRole; title: string; description: string }[] = [
  {
    id: 'customer',
    title: 'Customer',
    description: 'Find mechanics and request roadside assistance.',
  },
  {
    id: 'mechanic',
    title: 'Mechanic',
    description: 'Manage your mechanic profile and service requests.',
  },
];

export default function RegisterScreen() {
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
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        <View style={styles.logoBox}>
          <AutoCaresLogo style={styles.logoImage} />
        </View>

        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.description}>
          Register as a customer or mechanic. Administrator accounts are provisioned
          separately.
        </Text>

        <Text style={styles.label}>First Name*</Text>
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

        <Text style={styles.label}>Last Name*</Text>
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

        <Text style={styles.label}>Email*</Text>
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

        <Text style={styles.label}>Phone* (11 digits)</Text>
        <TextInput
          style={styles.input}
          placeholder="11 Digits number"
          placeholderTextColor={theme.colors.muted}
          value={phone}
          onChangeText={(value) => setPhone(value.replace(/\D/g, '').slice(0, 11))}
          keyboardType="number-pad"
          autoComplete="tel"
          maxLength={11}
          editable={!isSubmitting}
        />

        {role === 'mechanic' && (
          <>
            <Text style={styles.label}>Business Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Business name"
              placeholderTextColor={theme.colors.muted}
              value={businessName}
              onChangeText={setBusinessName}
              autoCapitalize="words"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>CNIC Number * (13 digits)</Text>
            <TextInput
              style={styles.input}
              placeholder="13 Digits CNIC number"
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
              placeholder="Years of experience"
              placeholderTextColor={theme.colors.muted}
              value={yearsExperience}
              onChangeText={(value) => setYearsExperience(value.replace(/\D/g, ''))}
              keyboardType="number-pad"
              editable={!isSubmitting}
            />

            <Text style={styles.label}>Mechanic Type *</Text>
            <View style={styles.vehicleTypes}>
              {mechanicTypes.map((type) => {
                const selected = mechanicType === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.mechanicType, selected && styles.vehicleTypeSelected]}
                    onPress={() => setMechanicType(type)}
                    disabled={isSubmitting}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Text style={styles.vehicleTypeText}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <Text style={styles.label}>Password *</Text>
        <TextInput
          style={styles.input}
          placeholder="At least 8 characters, 1 uppercase letter, 1 number"
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
          placeholder="Re-enter your password"
          placeholderTextColor={theme.colors.muted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          autoComplete="new-password"
          editable={!isSubmitting}
        />

        <Text style={styles.label}>I am a</Text>
        {roles.map((item) => {
          const selected = role === item.id;
          return (
            <Pressable
              key={item.id}
              style={[styles.infoCard, selected && styles.infoCardSelected]}
              onPress={() => setRole(item.id)}
              disabled={isSubmitting}>
              <Text style={styles.infoTitle}>{item.title}</Text>
              <Text style={styles.infoDescription}>{item.description}</Text>
            </Pressable>
          );
        })}

        {role === 'customer' && (
          <>
            <Text style={styles.label}>Vehicle Type*</Text>
            <View style={styles.vehicleTypes}>
              {vehicleTypes.map((type) => {
                const selected = vehicleType === type;
                return (
                  <Pressable
                    key={type}
                    style={[styles.vehicleType, selected && styles.vehicleTypeSelected]}
                    onPress={() => setVehicleType(type)}
                    disabled={isSubmitting}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}>
                    <Text style={styles.vehicleTypeText}>{type}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

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
            I agree to the Terms of Service and Privacy Policy.
          </Text>
        </Pressable>

        <Text style={styles.note}>
          Public registration will not grant administrator access.
        </Text>

        <Pressable
          style={[styles.button, isSubmitting && styles.buttonDisabled]}
          onPress={handleRegister}
          disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Create account</Text>
          )}
        </Pressable>

        <Text style={styles.bottomText}>
          Already registered?{' '}
          <Link href="/login" style={styles.link}>
            Login
          </Link>
        </Text>
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
    paddingHorizontal: 24,
    paddingVertical: 36,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  logoBox: {
    alignSelf: 'center',
    marginBottom: 20,
  },
  logoImage: {
    width: 210,
    height: 120,
    alignSelf: 'center',
  },
  title: {
    color: theme.colors.text,
    fontSize: 28,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  description: {
    color: theme.colors.muted,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 24,
    textAlign: 'center',
    fontSize: 14,
  },
  label: {
    color: theme.colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    marginBottom: 16,
    color: theme.colors.text,
    fontSize: 15,
  },
  vehicleTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  vehicleType: {
    minWidth: '22%',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  mechanicType: {
    flexGrow: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  vehicleTypeSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  vehicleTypeText: {
    color: theme.colors.text,
    fontWeight: '700',
  },
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    fontSize: 14,
    fontWeight: '800',
  },
  termsText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 19,
  },
  infoCard: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: theme.colors.surface,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    marginBottom: 12,
  },
  infoCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  infoTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  infoDescription: {
    color: theme.colors.muted,
    marginTop: 6,
    lineHeight: 19,
    fontSize: 13,
  },
  note: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginVertical: 10,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.2,
  },
  bottomText: {
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: 22,
    fontSize: 14,
  },
  link: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
