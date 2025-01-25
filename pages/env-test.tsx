export default function EnvTest() {
  return (
    <div>
      <h1>Environment Variables Test</h1>
      <pre>
        NEXT_PUBLIC_SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL}
      </pre>
    </div>
  );
} 