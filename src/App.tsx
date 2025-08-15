import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReqlineParser from "./components/ReqlineParser";
import MultipleEndpoints from "./components/MultipleEndpoints";
import config from "../config";

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 relative overflow-hidden">
        {/* Animated Background Blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse-slow"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-500/20 rounded-full blur-3xl animate-pulse-slow animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse-slow animation-delay-4000"></div>
        </div>

        {/* Header */}
        <header className="relative z-10 p-4 sm:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  {config.appName}
                </h1>
                <p className="text-blue-200 text-sm sm:text-base mt-1">
                  {config.appDescription}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-2 text-xs sm:text-sm text-green-300">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  API Online
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="relative z-10 p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<ReqlineParser />} />
            <Route path="/multiple-endpoints" element={<MultipleEndpoints />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="relative z-10 p-4 sm:p-6 lg:p-8 mt-auto">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-center sm:text-left">
              <div className="text-blue-200 text-xs sm:text-sm">
                Built with React, TypeScript, Tailwind CSS, and Vite
              </div>
              <div className="flex items-center justify-center sm:justify-end gap-4">
                <a
                  href="https://www.buymeacoffee.com/your-username"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-200 hover:text-white transition-colors duration-300 text-xs sm:text-sm"
                >
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                  </svg>
                  Buy Me a Coffee
                </a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
