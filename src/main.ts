import express, { Application, Request, Response } from 'express';

const app: Application = express();
const PORT: number = parseInt(process.env.PORT ?? '3000', 10);

app.get('/health', (_req: Request, res: Response): void => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, (): void => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`);
});

export default app;
