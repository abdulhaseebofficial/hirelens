# Deploy HireLens

Deploy the React frontend and FastAPI backend as separate services. Use PostgreSQL
for deployments with ephemeral filesystems or multiple API instances.

## Backend

The repository includes a [Dockerfile](../backend/Dockerfile) and a
[Render blueprint](../render.yaml). Use `backend/` as the Docker build context.
The container runs Alembic migrations before starting the API.

[Deploy with Render](https://render.com/deploy?repo=https://github.com/abdulhaseebofficial/hirelens)

Configure these environment variables on the API service:

| Variable | Value |
| --- | --- |
| `ENVIRONMENT` | `production` |
| `DATABASE_URL` | Your PostgreSQL connection string |
| `GOOGLE_API_KEY` | Your Gemini API key |
| `SECRET_KEY` | A persistent, randomly generated secret |
| `CORS_ORIGINS` | Your frontend origin, including `https://` |

The configuration accepts `postgres://` and `postgresql://` URLs and converts them
to the async driver format. For example:

```text
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/hirelens
```

Keep credentials in the hosting provider's environment settings.

### Vercel backend option

`backend/pyproject.toml` declares `app.main:app` as the entrypoint. Deploy `backend/`
as its own project and configure the same environment variables. Run
`alembic upgrade head` from `backend/` with the target database URL before serving traffic;
this deployment configuration does not run migrations automatically.

Analysis work uses background tasks within the API process. Serverless execution limits
can interrupt longer batches. Choose a persistent container service for longer jobs;
a durable external job queue is not included in this repository.

## Frontend

The root [vercel.json](../vercel.json) builds the frontend and configures SPA routing.
Set this variable before building:

```text
VITE_API_BASE_URL=https://your-api-host/api/v1
```

Vite embeds this value at build time. Redeploy after changing it.
Add the final frontend origin to the backend's `CORS_ORIGINS` setting.

For other static hosts, build from `frontend/` using `npm ci` and `npm run build`,
serve `frontend/dist`, and route frontend navigation paths to `index.html`.

## Verify the deployment

1. Open `/api/v1/health` on the API host to check process availability.
2. Open `/api/v1/health/ready` and confirm `checks.database` is `ok` and
   `checks.gemini` is `configured`. This confirms configuration, not a live Gemini request.
3. Register or sign in through the frontend.
4. Submit the sample CV and job description, then check the completed report.

The readiness endpoint currently returns a JSON status even when degraded;
monitor its response body when checking dependency health.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| API calls return the frontend page or 404 | Set `VITE_API_BASE_URL` and rebuild the frontend. |
| Browser rejects API requests | Match `CORS_ORIGINS` to the frontend origin. |
| Database connection fails | Check the URL, network access, and provider credentials. |
| Tables are missing | Run Alembic against the intended database. |
| Local app still uses SQLite | Set `DATABASE_URL` in a loaded `.env` file or process environment; `.env.local` is not loaded by the backend. |
| Sessions fail after restarting | Keep `SECRET_KEY` stable across processes and deployments. |
| Large batches stop early | Check host execution limits and backend logs. |
