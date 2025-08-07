# Reqline Parser Frontend

A modern, responsive web interface for the Reqline Parser API. This React application allows users to parse and execute HTTP requests using the custom Reqline syntax with a beautiful, intuitive interface.

## 🚀 Features

- **Modern UI/UX**: Beautiful gradient design with glassmorphism effects
- **Real-time Request Execution**: Execute HTTP requests directly from the browser
- **Comprehensive Response Display**: View parsed request details and response data
- **Example Library**: Built-in examples to help users understand the syntax
- **Error Handling**: Graceful error display with helpful messages
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices
- **Copy to Clipboard**: Easy copying of examples and results
- **Loading States**: Visual feedback during request execution

## 🛠️ Tech Stack

- **React 19** - Modern React with latest features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and development server
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API requests
- **Lucide React** - Beautiful, customizable icons
- **ESLint** - Code linting and formatting

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd reqline-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173`

## 🏗️ Project Structure

```
src/
├── components/
│   └── ReqlineParser.tsx    # Main application component
├── assets/                  # Static assets
├── App.tsx                  # Root application component
├── main.tsx                 # Application entry point
├── index.css               # Global styles and Tailwind imports
└── vite-env.d.ts           # Vite type definitions
```

## 🎨 UI Components

### Main Interface

- **Input Section**: Large textarea for entering Reqline syntax
- **Action Buttons**: Execute, Examples, and Clear functionality
- **Examples Panel**: Collapsible section with syntax examples
- **Results Display**: Comprehensive request and response information

### Response Display

- **Request Details**: Full URL, headers, query parameters, and body
- **Response Details**: Status code, duration, timestamps, and response data
- **Error Handling**: Clear error messages with helpful context

## 🔧 Configuration

### Environment Variables

The application connects to the live Reqline Parser API at:

- **Production API**: `https://reqline-cgup.onrender.com/`

### Build Configuration

```bash
# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

## 📱 Responsive Design

The application is fully responsive and optimized for:

- **Desktop**: Full-featured interface with side-by-side layouts
- **Tablet**: Adaptive layouts with optimized spacing
- **Mobile**: Stacked layouts with touch-friendly interactions

## 🎯 Usage Examples

### Basic GET Request

```
HTTP GET | URL https://dummyjson.com/quotes/3
```

### GET with Query Parameters

```
HTTP GET | URL https://dummyjson.com/quotes/3 | QUERY {"refid": 1920933}
```

### POST with Body

```
HTTP POST | URL https://jsonplaceholder.typicode.com/posts | BODY {"title": "Test", "body": "Test body", "userId": 1}
```

### Complete Request

```
HTTP GET | URL https://dummyjson.com/quotes/3 | HEADERS {"Authorization": "Bearer token"} | QUERY {"refid": 1920933}
```

## 🔍 API Integration

The frontend integrates with the Reqline Parser API:

- **Endpoint**: `POST /`
- **Content-Type**: `application/json`
- **Request Body**: `{ "reqline": "your reqline syntax" }`
- **Response**: Parsed request details and execution results

### Response Format

```json
{
  "request": {
    "query": {},
    "body": {},
    "headers": {},
    "full_url": "https://example.com"
  },
  "response": {
    "http_status": 200,
    "duration": 347,
    "request_start_timestamp": 1691234567890,
    "request_stop_timestamp": 1691234568237,
    "response_data": {}
  }
}
```

## 🧪 Testing

```bash
# Run linting
npm run lint

# Type checking
npm run build
```

## 🚀 Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Vercel will auto-detect the Vite configuration
3. Deploy with zero configuration

### Netlify

1. Build the project: `npm run build`
2. Deploy the `dist` folder to Netlify
3. Configure build settings if needed

### Other Platforms

The application can be deployed to any static hosting platform:

- GitHub Pages
- AWS S3 + CloudFront
- Firebase Hosting
- Any CDN supporting static files

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is part of the Reqline Parser ecosystem and follows the same licensing terms.

## 🔗 Links

- **Live Demo**: [Frontend Application](https://your-deployment-url.com)
- **API Documentation**: [Reqline Parser API](https://reqline-cgup.onrender.com/)
- **Postman Collection**: [API Documentation](https://documenter.getpostman.com/view/23410424/2sB3BDJqdi)

---

**Ready to parse HTTP requests with style!** 🚀
