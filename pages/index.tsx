import JournalInput from '../components/JournalInput';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto py-8">
        <h1 className="text-3xl font-bold text-center mb-8">Journal</h1>
        <JournalInput />
      </main>
    </div>
  );
} 