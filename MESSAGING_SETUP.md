# CampusGig — Messaging Setup Guide

## New Files
| File | Purpose |
|---|---|
| `add_messages.sql` | Adds `conversations` + `messages` tables to your DB |
| `ws_server.php` | WebSocket server (real-time chat engine) |
| `composer.json` | Tells Composer which PHP libraries to install |
| `index.html` | Updated frontend with full messaging UI |

---

## Step 1 — Add the Messages Tables
1. Go to `http://localhost/phpmyadmin`
2. Select the `campusgig` database on the left
3. Click **Import** → Choose `add_messages.sql` → **Go**

---

## Step 2 — Install Composer (one-time)
Composer is a PHP package manager needed to install the Ratchet WebSocket library.

1. Download from: **https://getcomposer.org/download/**
2. Run the installer (Windows: `Composer-Setup.exe`)
3. After install, open a new Command Prompt and confirm it works:
   ```
   composer --version
   ```

---

## Step 3 — Install Ratchet (WebSocket Library)
1. Open **Command Prompt** (CMD)
2. Navigate to your project folder:
   ```
   cd C:\xampp\htdocs\campusgig
   ```
3. Run:
   ```
   composer install
   ```
   This will create a `vendor/` folder with Ratchet inside.

---

## Step 4 — Start the WebSocket Server
In the same CMD window, run:
```
php ws_server.php
```

You should see:
```
CampusGig WebSocket server started.
Listening on ws://localhost:8080
```

**Keep this CMD window open** while using the app. The WebSocket server must be running for messaging to work.

---

## Step 5 — Use the App
Open: **`http://localhost/campusgig/index.html`**

Log in and click **Messages** in the sidebar. You'll see:
- A conversation list on the left
- Click **+ New Chat** to message any user
- Messages are sent in real-time and saved to MySQL

---

## How It Works

```
Browser (index.html)
    │
    ├─── HTTP fetch ──────► api.php  ──► MySQL (users, gigs, bookings)
    │
    └─── WebSocket ───────► ws_server.php ──► MySQL (conversations, messages)
                  ws://localhost:8080
```

- **api.php** handles all REST operations (login, gigs, bookings)
- **ws_server.php** handles real-time chat (send/receive messages, unread counts)
- Messages are persisted in MySQL so they survive page refreshes

---

## Troubleshooting

**"Connecting…" never changes / chat doesn't load**
- Make sure `php ws_server.php` is running in CMD
- Check that port 8080 isn't blocked by a firewall
- Open browser console (F12) and look for WebSocket errors

**`composer install` fails**
- Make sure PHP is in your PATH. In XAMPP, add `C:\xampp\php` to your Windows Environment Variables
- Or run using the full path: `C:\xampp\php\php.exe -r "copy('https://getcomposer.org/installer', 'composer-setup.php');"`

**Messages send but don't appear to other user**
- Both users must be logged in with the WS server running
- If testing with two browser tabs, use one normal + one incognito window
