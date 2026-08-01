// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // ✅ Simply redirect to login
  return <Redirect href="/auth/login" />;
}