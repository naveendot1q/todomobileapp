import React, {useEffect, useState} from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {ActivityIndicator, View} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import LoginScreen from './src/screens/LoginScreen';
import SetupTOTPScreen from './src/screens/SetupTOTPScreen';
import VerifyTOTPScreen from './src/screens/VerifyTOTPScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import {supabase} from './src/lib/supabase';

const Stack = createNativeStackNavigator();

export default function App() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(async ({data: {session}}) => {
      if (!session) {
        setInitialRoute('Login');
        return;
      }
      const {data} = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (data?.nextLevel === 'aal2' && data?.currentLevel !== 'aal2') {
        setInitialRoute('VerifyTOTP');
      } else if (data?.currentLevel === 'aal1' && data?.nextLevel === 'aal1') {
        setInitialRoute('SetupTOTP');
      } else {
        setInitialRoute('Dashboard');
      }
    });
  }, []);

  if (!initialRoute) {
    return (
      <View style={{flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center'}}>
        <ActivityIndicator color="#e8c547" size="large" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName={initialRoute}
          screenOptions={{headerShown: false, contentStyle: {backgroundColor: '#0a0a0f'}}}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="SetupTOTP" component={SetupTOTPScreen} />
          <Stack.Screen name="VerifyTOTP" component={VerifyTOTPScreen} />
          <Stack.Screen name="Dashboard" component={DashboardScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
