# Route 53 Console Clone: Frontend

The Next.js (App Router) + TypeScript + Cloudscape UI. The project overview, setup instructions, architecture and
API documentation are in the [root README](../README.md).

```bash
npm install
npm run dev      # http://localhost:3000 (needs the backend on BACKEND_URL, default http://localhost:8000)
npm run build    # production build
npm run lint
```

`BACKEND_URL` is where `src/proxy.ts` forwards `/api/*`; it is read at runtime (see `.env.example`).
