import React, {useEffect, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, ScrollView, Image, Alert,
} from 'react-native';
import {supabase} from '../lib/supabase';

export default function SetupTOTPScreen({navigation}: any) {
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => { setup(); }, []);

  async function setup() {
    try {
      const {data: {session}} = await supabase.auth.getSession();
      if (!session) { navigation.replace('Login'); return; }

      const {data: aal} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aal?.currentLevel === 'aal2') { navigation.replace('Dashboard'); return; }

      const {data, error} = await supabase.auth.mfa.enroll({
        factorType: 'totp',
        issuer: 'MyTodo',
        friendlyName: 'Microsoft Authenticator',
      });
      if (error || !data) {
        Alert.alert('Error', 'Setup failed. Please try again.');
        setLoading(false);
        return;
      }
      setFactorId(data.id);
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
    } catch {
      Alert.alert('Error', 'Something went wrong.');
    }
    setLoading(false);
  }

  async function verify() {
    if (code.length !== 6) { Alert.alert('Error', 'Enter the 6-digit code.'); return; }
    setVerifying(true);
    try {
      const {data: ch, error: ce} = await supabase.auth.mfa.challenge({factorId});
      if (ce || !ch) { Alert.alert('Error', 'Challenge failed.'); setVerifying(false); return; }
      const {error: ve} = await supabase.auth.mfa.verify({
        factorId, challengeId: ch.id, code,
      });
      if (ve) {
        Alert.alert('Wrong Code', 'Invalid code. Try again.');
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
      <View style={s.center}>
        <ActivityIndicator color="#e8c547" size="large" />
        <Text style={s.loadingText}>Setting up 2FA...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.scroll}>
      <Text style={s.title}>Set Up 2FA</Text>
      <Text style={s.sub}>Scan with Microsoft Authenticator</Text>

      <View style={s.card}>
        {['Open Microsoft Authenticator', 'Tap "+" → "Other account"', 'Scan the QR code below', 'Enter the 6-digit code'].map((step, i) => (
          <Text key={i} style={s.step}>{i + 1}. {step}</Text>
        ))}
      </View>

      {qrCode ? (
        <View style={s.qrWrap}>
          <View style={{backgroundColor: '#fff', padding: 12, borderRadius: 12}}>
            <Image source={{uri: qrCode}} style={{width: 180, height: 180}} />
          </View>
          <View style={s.secretBox}>
            <Text style={s.secretLabel}>Can't scan? Enter manually:</Text>
            <Text style={s.secretVal} selectable>{secret}</Text>
          </View>
        </View>
      ) : null}

      <View style={s.card}>
        <Text style={s.label}>6-digit code from Authenticator</Text>
        <TextInput
          style={s.otpInput}
          value={code}
          onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
          keyboardType="number-pad"
          placeholder="000000"
          placeholderTextColor="#6b6b8a"
          maxLength={6}
          textAlign="center"
        />
        <TouchableOpacity
          style={[s.btn, (verifying || code.length < 6) && s.btnOff]}
          onPress={verify}
          disabled={verifying || code.length < 6}
          activeOpacity={0.8}>
          {verifying
            ? <ActivityIndicator color="#0a0a0f" />
            : <Text style={s.btnText}>Activate & Continue</Text>}
        </TouchableOpacity>
      </View>
      <View style={{height: 40}} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#0a0a0f'},
  center: {flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center'},
  scroll: {padding: 24},
  loadingText: {color: '#6b6b8a', marginTop: 12},
  title: {fontSize: 26, fontWeight: '700', color: '#fff', textAlign: 'center', marginTop: 20},
  sub: {fontSize: 13, color: '#6b6b8a', textAlign: 'center', marginTop: 4, marginBottom: 20},
  card: {
    backgroundColor: '#1a1a24', borderRadius: 14,
    borderWidth: 1, borderColor: '#2a2a3a', padding: 16, marginBottom: 16,
  },
  step: {color: '#6b6b8a', fontSize: 13, marginBottom: 8, lineHeight: 20},
  qrWrap: {alignItems: 'center', marginBottom: 16, gap: 12},
  secretBox: {
    backgroundColor: '#111118', borderRadius: 10,
    borderWidth: 1, borderColor: '#2a2a3a', padding: 12, width: '100%',
  },
  secretLabel: {color: '#6b6b8a', fontSize: 11, marginBottom: 4},
  secretVal: {color: '#e8c547', fontSize: 11, fontFamily: 'monospace'},
  label: {color: '#6b6b8a', fontSize: 13, marginBottom: 8},
  otpInput: {
    backgroundColor: '#111118', borderWidth: 1, borderColor: '#2a2a3a',
    borderRadius: 10, padding: 16, color: '#fff',
    fontSize: 28, fontWeight: '600', letterSpacing: 8, marginBottom: 12,
  },
  btn: {backgroundColor: '#e8c547', borderRadius: 10, padding: 14, alignItems: 'center'},
  btnOff: {backgroundColor: '#6b6b8a'},
  btnText: {color: '#0a0a0f', fontWeight: '700', fontSize: 15},
});
