# PKI Demonstration

## Deploy the frontend to Netlify

Netlify reads [netlify.toml](./netlify.toml), publishes `public/`, and routes the
site's root to the login page. The `/login`, `/register`, and `/dashboard` paths
are also configured.

Set the Netlify environment variable `API_BASE_URL` to the public origin of the
deployed Express API (for example, `https://your-api.example.com`), then deploy
or trigger a new deploy. The Netlify build writes this value into the frontend.
If it is empty, the frontend uses its own origin, which is useful for local
development but will not connect to a separately hosted API.

## Deploy the API to Render

The [render.yaml](./render.yaml) blueprint defines the Express service and
persistent certificate storage. It expects a hosted MySQL database and includes
placeholders for its connection settings.

1. Create a MySQL database and run [database/schema.sql](./database/schema.sql)
   against it.
2. Deploy the Render blueprint. Supply `DB_HOST`, `DB_USER`, `DB_PASSWORD`, and
   `DB_NAME` when prompted. Render generates `JWT_SECRET`.
3. Add two Render secret files using the local files
   `keys/root-ca/ca-key.pem` and `certificates/root-ca/ca-cert.pem`, named
   `ca-key.pem` and `ca-cert.pem`. The blueprint points to their mounted paths.
4. Once the API is deployed, set Netlify's `API_BASE_URL` to its public origin
   and redeploy the frontend.

The Render blueprint uses a Starter service and a persistent disk because
issued certificate files, generated user keys, and PDFs are written to disk.
The CA private key must remain a Render secret file; do not commit it or put it
in the Netlify site's published files. The repository's `.gitignore` excludes
`.env`, private keys, and certificate files.

Netlify hosts the static frontend only. `server.js`, MySQL, and certificate
signing run on the separate API host.
