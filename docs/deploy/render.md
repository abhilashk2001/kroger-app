# Persistent free hosting (Render + Neon)

Unlike the one-time Azure proof, this is an **always-available** deployment for a
shareable link (resume / recruiters). The app runs as a single Docker web service on
**Render** (free) against a free, persistent **Neon** PostgreSQL database.

- **App host:** Render free web service (Docker). No credit card. It **sleeps after ~15
  min idle**, so the first visit after a quiet spell cold-starts in ~50s — see
  [Keeping it warm](#keeping-it-warm).
- **Database:** Neon free Postgres. No credit card; data persists; compute auto-suspends
  when idle and resumes in ~1s.

## 1. Create the database (Neon)

1. Sign up at **neon.tech** (GitHub login is easiest) and create a project — pick a
   region near your Render region (US East pairs well with Render's `ohio`).
2. Copy the **connection string**. Use the **direct** (un-pooled) one for `DATABASE_URL`
   so Prisma migrations work; it looks like:
   ```
   postgresql://<user>:<pass>@<host>.neon.tech/<db>?sslmode=require
   ```
   Keep it handy for steps 3 and 4.

## 2. Push the repo to GitHub

Render deploys from a Git repo. Create an empty repo on github.com (e.g. `kroger-app`),
then from the project root:

```bash
git remote add origin https://github.com/<you>/kroger-app.git
git push -u origin main
```

(Or, if you install the GitHub CLI: `gh repo create kroger-app --public --source=. --push`.)

## 3. Deploy on Render

1. Sign up at **render.com** (GitHub login) and grant access to the repo.
2. **New → Blueprint**, select the repo. Render reads [`render.yaml`](../../render.yaml)
   and proposes the `kroger-app` web service (Docker, free).
3. When prompted, set **`DATABASE_URL`** to your Neon connection string from step 1.
   (`JWT_SECRET` is generated for you; `PORT` is injected by Render.)
4. **Apply** / **Create**. Render builds the Dockerfile and boots the container, which
   runs `prisma migrate deploy` automatically, then starts the server. First build takes
   a few minutes.
5. Your live URL is shown as `https://kroger-app-<id>.onrender.com` (also under the
   service's page). Confirm `‹url›/api/health` returns `{"status":"ok", ...}`.

## 4. Seed the data

The database is empty after the first deploy. Two parts:

1. **Core data (Search + Dashboard):** open the live URL, register a user, and upload the
   three CSVs from `data/sample/` on the **Load Data** tab.
2. **ML tabs (Basket + Churn):** run the offline jobs against Neon from your machine
   (Neon allows connections by default — no firewall step needed):

   ```bash
   docker compose run --rm \
     -e POSTGRES_HOST=<host>.neon.tech \
     -e POSTGRES_USER=<user> \
     -e POSTGRES_PASSWORD=<pass> \
     -e POSTGRES_DB=<db> \
     -e POSTGRES_SSLMODE=require \
     ml python basket_analysis.py
   # then the same with: python churn.py
   ```

Because Neon persists, you seed once and the link stays populated.

## Keeping it warm

Render free services sleep after ~15 min idle. To avoid a cold start when a recruiter
clicks, ping the health endpoint every ~10–14 minutes with a free uptime monitor
(e.g. **cron-job.org** or **UptimeRobot**):

```
GET https://kroger-app-<id>.onrender.com/api/health   every 10 min
```

One always-pinged free service stays within Render's 750 free instance-hours/month.

## Updating the deployment

`autoDeploy` is on: pushing to `main` triggers a rebuild and redeploy. Migrations run on
each boot, so new migrations apply automatically.

## Notes

- Render builds on linux/amd64, so the cross-arch image concerns from the Azure guide
  don't apply here.
- This deployment is meant to stay up; there is no teardown step. To remove it, delete the
  Render service and the Neon project from their dashboards.
