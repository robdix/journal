import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navigation() {
  const router = useRouter();
  
  return (
    <nav className="bg-white shadow-sm mb-8">
      <div className="container mx-auto px-4">
        <div className="flex space-x-8 py-4">
          <Link 
            href="/"
            className={`${
              router.pathname === '/' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            } px-1 py-2`}
          >
            Journal
          </Link>
          <Link 
            href="/insights"
            className={`${
              router.pathname === '/insights' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            } px-1 py-2`}
          >
            Insights
          </Link>
          <Link 
            href="/context"
            className={`${
              router.pathname === '/context' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            } px-1 py-2`}
          >
            Context
          </Link>
          <Link 
            href="/summary"
            className={`${
              router.pathname === '/summary' 
                ? 'text-blue-600 border-b-2 border-blue-600' 
                : 'text-gray-500 hover:text-gray-700'
            } px-1 py-2`}
          >
            Weekly Summary
          </Link>
        </div>
      </div>
    </nav>
  );
}
