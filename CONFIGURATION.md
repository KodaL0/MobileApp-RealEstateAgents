# Simple Configuration Guide

## Overview

Two modes: **Development** and **Production**. Automatically switches based on how you run the app.

---

## Development Mode

**When:** Running `npm start` or `expo start`

**API:** `http://YOUR_IP:8000/api`

**To use:** Update `DEV_IP` in `config/api.ts` line 18:
```typescript
const DEV_IP = '192.168.0.17'; // ← Your computer's IP
```

---

## Production Mode

**When:** Building with `npm run build` or production builds

**API:** `https://api.propertpro.com/api`

**To use:** Nothing needed - automatically used in production builds

---

## Override Everything

Set environment variable:
```bash
EXPO_PUBLIC_API_URL=http://192.168.0.17:8000/api
```

---

## Finding Your IP

**Windows:**
```powershell
ipconfig | Select-String "IPv4"
```

**Mac/Linux:**
```bash
ifconfig | grep "inet "
```

---

## That's It!

- **Development:** Set your IP, run `npm start`
- **Production:** Build normally, uses production API
- **Override:** Set `EXPO_PUBLIC_API_URL` if needed

No complex logic. Simple and clear.

