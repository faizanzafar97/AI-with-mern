require('dotenv').config();

const app=require('./src/app');
const connectDB=require('./src/config/database');

async function startServer() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured. Add it to the root .env file.');
  }

  const aiProvider = (process.env.AI_PROVIDER || 'ollama').trim().toLowerCase();
  if (!['ollama', 'openai'].includes(aiProvider)) {
    throw new Error('AI_PROVIDER must be either "ollama" or "openai".');
  }
  if (aiProvider === 'openai' && !process.env.OPENAI_API_KEY?.trim()) {
    console.warn('OPENAI_API_KEY is not configured. OpenAI interview requests will return 503.');
  }

  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  await connectDB();

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error('Server startup failed:', error.message);
  process.exitCode = 1;
});
