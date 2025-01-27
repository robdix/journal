import ContextForm from '../components/ContextForm';

export default function Context() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Context Settings</h1>
        <ContextForm />
      </main>
    </div>
  );
}

// This ensures the page is rendered client-side
Context.getInitialProps = async () => {
  return { props: {} };
}; 