import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { Toaster } from '@/components/ui/toaster'
import Home from "./pages/Home.jsx";

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={
            <div className="fixed inset-0 flex items-center justify-center bg-[#0f0f0f] text-white">
              Page not found
            </div>
          } />
        </Routes>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}
