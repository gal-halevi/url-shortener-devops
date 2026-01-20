import app from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 URL Service running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`📍 Ready check: http://localhost:${PORT}/ready`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
});