import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
  ScrollView, Alert,
} from 'react-native';
import {supabase} from '../lib/supabase';

export default function LoginScreen({navigation}: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const {error} = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        Alert.alert('Login Failed', 'Invalid email or password.');
        setLoading(false);
        return;
      }
      const {data} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
        navigation.replace('VerifyTOTP');
      } else {
        navigation.replace('SetupTOTP');
      }
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    }
    setLoading(false);
  }

  return (
    <KeyboardAvoidingView
      style={s.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        contentContainerStyle={s.scroll}
        keyboardShouldPersistTaps="handled">
        <View style={s.logoBox}>
          <Text style={s.logoText}>✦</Text>
        </View>
        <Text style={s.title}>Welcome back</Text>
        <Text style={s.sub}>Your private workspace awaits</Text>

        <View style={s.card}>
          <Text style={s.label}>Email</Text>
          <TextInput
            style={s.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6b6b8a"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[s.label, {marginTop: 12}]}>Password</Text>
          <TextInput
            style={s.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b6b8a"
            secureTextEntry
            returnKeyType="go"
            onSubmitEditing={handleLogin}
          />
          <TouchableOpacity
            style={s.btn}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}>
            {loading ? (
              <ActivityIndicator color="#0a0a0f" />
            ) : (
              <Text style={s.btnText}>Continue →</Text>
            )}
          </TouchableOpacity>
        </View>
        <Text style={s.footer}>🔐 Protected by Microsoft Authenticator</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  flex: {flex: 1, backgroundColor: '#0a0a0f'},
  scroll: {flexGrow: 1, justifyContent: 'center', padding: 24},
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(232,197,71,0.1)',
    borderWidth: 1, borderColor: 'rgba(232,197,71,0.25)',
    alignItems: 'center', justifyContent: 'center',
    alignSelf: 'center', marginBottom: 16,
  },
  logoText: {fontSize: 28, color: '#e8c547'},
  title: {fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center'},
  sub: {fontSize: 13, color: '#6b6b8a', textAlign: 'center', marginTop: 4, marginBottom: 24},
  card: {
    backgroundColor: '#1a1a24', borderRadius: 16,
    borderWidth: 1, borderColor: '#2a2a3a', padding: 20,
  },
  label: {fontSize: 13, color: '#6b6b8a', marginBottom: 6},
  input: {
    backgroundColor: '#111118', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 10, padding: 14, color: '#c8c8e0', fontSize: 15,
  },
  btn: {
    backgroundColor: '#e8c547', borderRadius: 10,
    padding: 14, alignItems: 'center', marginTop: 16,
  },
  btnText: {color: '#0a0a0f', fontWeight: '700', fontSize: 16},
  footer: {color: '#6b6b8a', fontSize: 11, textAlign: 'center', marginTop: 24},
});
