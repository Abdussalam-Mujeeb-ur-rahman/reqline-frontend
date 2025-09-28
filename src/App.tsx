import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ReqlineParser from "./components/ReqlineParser";
import MultipleEndpoints from "./components/MultipleEndpoints";
import ThemeProvider from "./contexts/ThemeContext";
import ThemeToggle from "./components/ThemeToggle";
import { useTheme } from "./contexts/ThemeContext";
import config from "../config";

const AppContent = () => {
  const { isDark } = useTheme();

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-300 ${
        isDark ? "bg-slate-900" : "bg-slate-50"
      }`}
    >
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-40 -right-40 w-80 h-80 rounded-full blur-3xl ${
            isDark ? "bg-emerald-900/20" : "bg-emerald-100/30"
          }`}
        ></div>
        <div
          className={`absolute -bottom-40 -left-40 w-80 h-80 rounded-full blur-3xl ${
            isDark ? "bg-amber-900/20" : "bg-amber-100/30"
          }`}
        ></div>
        <div
          className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl ${
            isDark ? "bg-slate-800/40" : "bg-slate-100/50"
          }`}
        ></div>
      </div>

      {/* Header */}
      <header className="relative z-10 p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className={`text-2xl sm:text-3xl lg:text-4xl font-bold ${
                  isDark ? "text-slate-100" : "text-slate-800"
                }`}
              >
                {config.appName}
              </h1>
              <p
                className={`text-sm sm:text-base mt-1 ${
                  isDark ? "text-slate-300" : "text-slate-600"
                }`}
              >
                {config.appDescription}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <ThemeToggle />
              <div
                className={`flex items-center gap-2 text-xs sm:text-sm ${
                  isDark ? "text-emerald-400" : "text-emerald-600"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full animate-pulse ${
                    isDark ? "bg-emerald-400" : "bg-emerald-500"
                  }`}
                ></div>
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
            <div
              className={`text-xs sm:text-sm ${
                isDark ? "text-slate-400" : "text-slate-600"
              }`}
            >
              Built with React, TypeScript, Tailwind CSS, and Vite
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-4">
              <a
                href="https://www.buymeacoffee.com/your-username"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-2 transition-colors duration-300 text-xs sm:text-sm ${
                  isDark
                    ? "text-slate-400 hover:text-slate-300"
                    : "text-slate-600 hover:text-slate-800"
                }`}
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
  );
};

const App = () => {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
};

export default App;
