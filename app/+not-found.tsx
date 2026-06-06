import { Redirect } from 'expo-router';

// Redirect any unmatched URL back to the Dashboard.
export default function NotFound() {
  return <Redirect href="/" />;
}
