import ChatInterface from '../components/ChatInterface';

function Insights() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Journal Insights</h1>
        <ChatInterface />
      </main>
    </div>
  );
}

// This ensures the page is rendered client-side
Insights.getInitialProps = async () => {
  return { props: {} };
};

export default Insights; 