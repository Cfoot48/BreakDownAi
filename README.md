# BreakDown AI Chrome Extension

An AI-powered Chrome extension that analyzes YouTube videos and provides intelligent content breakdowns using OpenAI's API. Built with **React** and **TypeScript** for a modern, maintainable codebase.

## Features

- 🔍 **Smart Video Analysis**: Automatically extracts video information from YouTube pages
- 🤖 **AI-Powered Insights**: Uses OpenAI to provide intelligent content breakdowns
- ⚛️ **React-Based UI**: Modern component-based architecture with hooks and state management
- 🎨 **Beautiful UI**: Modern, gradient-based design that integrates seamlessly with YouTube
- 🔐 **Secure API Management**: Safely stores your OpenAI API key in Chrome's secure storage
- ⚡ **Real-time Processing**: Instant analysis with loading animations and status updates
- 📱 **Responsive Design**: Works perfectly across different screen sizes

## Tech Stack

- **React 18** - Modern component-based UI library
- **TypeScript** - Type-safe development
- **Webpack 5** - Modern build system with hot reloading
- **Chrome Extension Manifest V3** - Latest extension standards
- **OpenAI API** - AI-powered content analysis

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)
- Chrome browser
- OpenAI API key

### Installation

1. **Clone or download this repository**
   ```bash
   git clone <repository-url>
   cd BreakDownAi
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Build the extension**
   ```bash
   npm run build
   ```

4. **Load the extension in Chrome**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `dist` folder from this project

5. **Configure your OpenAI API key**
   - Click on the BreakDown AI extension icon in your Chrome toolbar
   - Enter your OpenAI API key in the popup
   - Click "Save API Key"

## Usage

1. **Navigate to any YouTube video**
2. **Look for the "🔍 Analyze with AI" button** that appears on the page
3. **Click the button** to start the analysis
4. **View the AI-generated breakdown** of the video content

## Development

### Project Structure

```
src/
├── background.ts      # Service worker for extension logic
├── content.tsx        # React component for YouTube page integration
├── popup.tsx         # React component for settings popup
├── popup.html        # HTML template for popup
├── popup.css         # Styles for popup component
├── content.css       # Styles for content script
├── manifest.json     # Extension manifest
└── icons/            # Extension icons
```

### Available Scripts

- `npm run build` - Build the extension for production
- `npm run dev` - Build in development mode with watch
- `npm test` - Run tests (not implemented yet)

### Building for Development

```bash
npm run dev
```

This will watch for file changes and automatically rebuild the extension.

### React Components

#### Popup Component (`src/popup.tsx`)
- Manages API key storage and retrieval
- Provides user feedback with loading states
- Modern form handling with React hooks

#### Content Script Component (`src/content.tsx`)
- Injects React components into YouTube pages
- Handles video information extraction
- Manages analysis state and user interactions

## How It Works

1. **Content Script**: Injects React components into YouTube pages to extract video information and add the analysis button
2. **Background Script**: Handles API key storage and communication between components
3. **Popup Component**: Provides a React-based user interface for managing the OpenAI API key
4. **AI Integration**: Uses OpenAI's API to analyze video content and provide insights

## React Features Used

- **Functional Components** with hooks
- **useState** for local state management
- **useEffect** for side effects and lifecycle management
- **TypeScript interfaces** for type safety
- **Modern React patterns** and best practices

## Security

- Your OpenAI API key is stored securely in Chrome's sync storage
- The extension only requests necessary permissions for YouTube integration
- No data is sent to external servers except OpenAI's API
- React's built-in XSS protection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes using React best practices
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

If you encounter any issues or have questions, please open an issue on the repository.
