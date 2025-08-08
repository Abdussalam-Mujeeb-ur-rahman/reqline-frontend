import ReqlineParser from "./components/ReqlineParser";
import ErrorBoundary from "./components/ErrorBoundary";
import config from "../config";

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-indigo-900 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow"></div>
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/30 to-cyan-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute top-40 left-40 w-80 h-80 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 rounded-full mix-blend-multiply filter blur-3xl animate-pulse-slow"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 glass border-b border-white/10 sticky top-0">
        <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">
                  {config.appName}
                </h1>
                <p className="text-blue-200 text-xs sm:text-sm hidden sm:block">
                  {config.appDescription}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-blue-200">
                <div className="w-2 h-2 sm:w-3 sm:h-3 status-online rounded-full animate-pulse"></div>
                <span className="text-xs sm:text-sm font-medium">
                  API Online
                </span>
              </div>
              <div className="hidden sm:block w-px h-6 bg-white/20"></div>
              <div className="text-blue-200 text-xs sm:text-sm hidden sm:block">
                v1.0.0
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-4 sm:px-6 py-6 sm:py-12">
        <ErrorBoundary>
          <ReqlineParser />
        </ErrorBoundary>
      </main>

      {/* Footer */}
      <footer className="relative z-10 glass border-t border-white/10 mt-12 sm:mt-20">
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-blue-200 mb-3 sm:mb-4 text-sm sm:text-base">
              Built with modern web technologies
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm text-blue-300 mb-4 sm:mb-6">
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400 rounded-full"></div>
                React 19
              </span>
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-400 rounded-full"></div>
                TypeScript
              </span>
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-orange-400 rounded-full"></div>
                Vite
              </span>
              <span className="flex items-center gap-1 sm:gap-2">
                <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-cyan-400 rounded-full"></div>
                Tailwind CSS v4
              </span>
            </div>
            
            {/* Buy Me a Coffee Section */}
            <div className="border-t border-white/10 pt-4 sm:pt-6">
              <p className="text-blue-200 mb-3 sm:mb-4 text-sm sm:text-base">
                If you find this tool helpful, consider supporting the developer
              </p>
              <a
                href="https://buymeacoffee.com/allahisrabb"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600 text-white font-medium rounded-lg transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
              >
                <svg
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M2 21h18v-2H2v2zm6.4-6.8c.4-.4.4-1 0-1.4L7.6 12l1.4-1.4c.4-.4.4-1 0-1.4s-1-.4-1.4 0L4.8 12l1.4 1.4c.4.4 1 .4 1.4 0zm6.4 0c.4-.4.4-1 0-1.4L14 12l1.4-1.4c.4-.4.4-1 0-1.4s-1-.4-1.4 0L11.2 12l1.4 1.4c.4.4 1 .4 1.4 0z"/>
                  <path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.11 0 2-.89 2-2V5c0-1.11-.89-2-2-2zM20 8h-2V5h2v3z"/>
                </svg>
                <span className="text-sm sm:text-base">☕ Buy Me a Coffee</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
