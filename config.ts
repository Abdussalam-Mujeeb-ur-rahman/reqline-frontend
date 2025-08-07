// Configuration for the Reqline Parser Frontend

export const config = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL || "https://reqline-cgup.onrender.com",

  // Application Settings
  appName: "Reqline Parser",
  appDescription: "Parse and execute HTTP requests using custom syntax",

  // UI Settings
  toastDuration: 3000, // milliseconds
  maxResponseHeight: "24rem", // 384px

  // Development Settings
  isDevelopment: import.meta.env.DEV,
} as const;

export default config;
