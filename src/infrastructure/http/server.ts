import { createApp } from './app';

const PORT = process.env.PORT || 3000;

/**
 * Start the server
 */
function startServer() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📝 Health check: http://localhost:${PORT}/health`);
  });
}

// Start server if this file is run directly
if (require.main === module) {
  startServer();
}

export { startServer };
