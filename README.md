# socket-server

Realtime Socket.IO server for lolboost.gg.

Required Hostinger environment variable:

```text
REALTIME_SECRET=put-a-long-random-secret-here
```

Optional strict whitelist:

```text
ALLOWED_ORIGINS=https://lolboost.gg,https://www.lolboost.gg,https://new.lolboost.gg,https://testing.lolboost.gg,https://progress.lolboost.gg
```

By default all HTTPS subdomains of `lolboost.gg` are allowed, for example `new.lolboost.gg`.
To disable that and only use the whitelist above:

```text
ALLOW_LOLBOOST_SUBDOMAINS=false
```

Start command:

```bash
npm start
```
