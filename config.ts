// Configuration for the Reqline Parser Frontend

const config = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:3000",
  appName: "Reqline Parser",
  appDescription: "Parse and execute HTTP requests using custom syntax",
  toastDuration: 3000,
  maxResponseHeight: "24rem",
  isDevelopment: import.meta.env.DEV,
} as const;

export default config;
