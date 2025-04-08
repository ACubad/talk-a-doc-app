// Removed unused imports: createServerComponentClient, AuthForm, cookies
import MainApp from '@/components/MainApp';

// This component is only rendered when the user is authenticated (due to AppLayout check)
// No need for async or user checks here anymore.
export default function Home() {
  // Directly render the main application component
  return <MainApp />;
}
