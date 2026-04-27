import React, {useEffect, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import {supabase} from '../lib/supabase';

export default function VerifyTOTPScreen({navigation}: any) {
  const [code, setCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const {data} = await supabase.auth.mfa.listFactors();
      const f = data?.totp?.[0];
      if (!f) { navigation.replace('SetupTOTP'); return; }
      setFactorId(f.id);
    } catch { navigation.replace('Login'); }
    setLoading(false);
  }

  async function verify() {
    if (code.length !== 6) { return; }
    setVerifying(true);
    try {
      const {data: ch, error: ce} = await supabase.auth.mfa.challenge({factorId});
      if (ce || !ch) { Alert.alert('Error', 'Try again.'); setVerifying(false); return; }
      const {error: ve} = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code,
      });
      if (ve) {
        Alert.alert('Wrong Code', 'Invalid code. Check the app.');
        setCode(''); setVerifying(false); return;
      }
      navigation.replace('Dashboard');
    } catch {
      Alert.alert('Error', 'Verification failed.');
      setVerifying(false);
    }
  }

  if (loading) {
    return (
      <View style={s.center}><ActivityIndicator color="#e8c547" size="large" /></View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={s.inner}>
        <TouchableOpacity onPress={() => navigation.replace('Login')} style={s.back}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.iconBox}>
          <Text style={s.icon}>📱</Text>
        </View>
        <Text style={s.title}>Two-Factor Auth</Text>
        <Text style={s.sub}>
          Enter the 6-digit code from{'\n'}Microsoft Authenticator
        </Text>
        <View style={s.card}>
          <TextInput
            style={s.otpInput}
            value={code}
            onChangeText={v => {
              const c = v.replace(/\D/g, '').slice(0, 6);
              setCode(c);
              if (c.length === 6) {
                setTimeout(() => verify(), 100);
              }
            }}
            keyboardType="number-pad"
            placeholder="000000"
            placeholderTextColor="#6b6b8a"
            maxLength={6}
            textAlign="center"
            autoFocus
          />
          <TouchableOpacity
            style={[s.btn, (verifying || code.length < 6) && s.btnOff]}
            onPress={verify}
            disabled={verifying || code.length < 6}
            activeOpacity={0.8}>
            {verifying
              ? <ActivityIndicator color="#0a0a0f" />
              : <Text style={s.btnText}>Verify & Sign In</Text>}
          </TouchableOpacity>
          <Text style={s.hint}>Code refreshes every 30 seconds</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0f'},
  center: {flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center'},
  inner: {flex: 1, padding: 24, justifyContent: 'center'},
  back: {marginBottom: 24},
  backText: {color: '#6b6b8a', fontSize: 14},
  iconBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: 'rgba(232,197,71,0.1)',
    borderWidth: 1, borderColor: 'rgba(232,197,71,0.25)',
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 16,
  },
  icon: {fontSize: 28},
  title: {fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center'},
  sub: {fontSize: 13, color: '#6b6b8a', textAlign: 'center', marginTop: 6, marginBottom: 24, lineHeight: 20},
  card: {
    backgroundColor: '#1a1a24', borderRadius: 16,
    borderWidth: 1, borderColor: '#2a2a3a', padding: 20,
  },
  otpInput: {
    backgroundColor: '#111118', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 10, padding: 16, color: '#fff',
    fontSize: 32, fontWeight: '600', letterSpacing: 10, marginBottom: 12,
  },
  btn: {backgroundColor: '#e8c547', borderRadius: 10, padding: 14, alignItems: 'center'},
  btnOff: {backgroundColor: '#6b6b8a'},
  btnText: {color: '#0a0a0f', fontWeight: '700', fontSize: 15},
  hint: {color: '#6b6b8a', fontSize: 11, textAlign: 'center', marginTop: 12},
});
