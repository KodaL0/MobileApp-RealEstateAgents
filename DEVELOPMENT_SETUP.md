# Mobile Development Setup

## Quick Start

### 1. Configure Your Local IP (for Physical Devices)

**Find your IP address:**

**Windows (PowerShell):**
```powershell
ipconfig | Select-String "IPv4"
```

**macOS/Linux:**
```bash
ifconfig | grep "inet "
```

**Example output:**
```
192.168.0.17  ← This is your local IP
```

---

### 2. Update API Configuration

**Option A: Edit config file** (Quick)

Edit `mobile-v1/config/api.ts`, line 17:
```typescript
const LOCAL_IP = '192.168.0.17'; // ← Change to your IP
```

**Option B: Use environment variables** (Recommended)

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Edit `.env`:
```bash
EXPO_PUBLIC_LOCAL_IP=192.168.0.17  # Your computer's IP
EXPO_PUBLIC_DEV_PORT=8000          # Django dev server port
```

---

### 3. Start Development Servers

**Terminal 1 - Django Backend:**
```bash
cd Propertprodjango/dev
./start_dev.ps1
```
✅ Django will run on `http://localhost:8000`

**Terminal 2 - Expo Frontend:**
```bash
cd mobile-v1
npm start
```
✅ Expo will run on `http://localhost:8081`

---

### 4. Choose Your Platform

When Expo starts, press:
- **`w`** - Open in web browser
- **`i`** - Open iOS simulator
- **`a`** - Open Android emulator
- **Scan QR code** - Open on physical device (Expo Go app)

---

## API URLs by Platform

| Platform | URL Used | Configuration |
|----------|----------|---------------|
| **Web** | `http://localhost:8000/api` | ✅ Auto-configured |
| **iOS Simulator** | `http://YOUR_IP:8000/api` | Update LOCAL_IP |
| **Android Emulator** | `http://YOUR_IP:8000/api` | Update LOCAL_IP |
| **Physical Device** | `http://YOUR_IP:8000/api` | Update LOCAL_IP |

---

## Verification

When the app starts, check the console for:

```
🌐 API Base URL: http://192.168.0.17:8000/api
📱 Platform: ios
🔧 Development Mode: true
```

If you see `https://api.propertpro.com/api`, you're pointing to production! ⚠️

---

## Network Requirements

### ✅ **For Web Development:**
- No special network setup needed
- Django on `localhost:8000`
- Expo on `localhost:8081`

### 📱 **For Native Development (Simulators/Devices):**
1. **Same WiFi Network**
   - Computer and phone/device on same network
   
2. **Firewall Rules**
   - Allow incoming connections on port 8000
   - Windows: Check Windows Defender Firewall
   - Mac: Check System Preferences → Security → Firewall

3. **Django Settings**
   - ✅ Already configured to accept local connections
   - See `Propertprodjango/EXPO_DJANGO_DEV_CONFIG.md`

---

## Troubleshooting

### Problem: "Network request failed" on device

**Cause**: App can't reach Django server

**Solutions**:
1. ✅ Verify both devices on same WiFi
2. ✅ Check LOCAL_IP is correct
3. ✅ Test Django reachable: Open `http://YOUR_IP:8000/admin/` on phone browser
4. ✅ Check firewall allows port 8000

### Problem: API points to production

**Cause**: Built in production mode

**Solutions**:
1. ✅ Clear Metro bundler: Press `r` in Expo terminal
2. ✅ Restart Expo dev server: `npm start`
3. ✅ Check console logs for API URL

### Problem: CORS errors

**Cause**: Django not allowing origin

**Solutions**:
1. ✅ Verify `DEBUG=True` in Django settings
2. ✅ Check `Propertprodjango/config/settings.py` includes your IP in CORS_ALLOWED_ORIGINS
3. ✅ Restart Django server after changes

---

## Environment Variables Reference

### Available Variables:

```bash
# Your computer's local IP (for native devices)
EXPO_PUBLIC_LOCAL_IP=192.168.0.17

# Django dev server port
EXPO_PUBLIC_DEV_PORT=8000

# Override entire API URL (optional)
EXPO_PUBLIC_API_URL=http://192.168.0.17:8000/api
```

### How It Works:

```typescript
// In config/api.ts
const LOCAL_IP = process.env.EXPO_PUBLIC_LOCAL_IP || '192.168.0.17';
const DEV_PORT = process.env.EXPO_PUBLIC_DEV_PORT || '8000';
```

---

## Production Build

When building for production:

```bash
# Production build automatically uses production API
npm run build:web
```

**API URL**: `https://api.propertpro.com/api` ✅

No configuration needed - automatically switches to production!

---

## Different Computer/Network?

If you move to a different location:

1. **Find new IP:**
   ```bash
   ipconfig    # Windows
   ifconfig    # Mac/Linux
   ```

2. **Update config:**
   - Edit `config/api.ts` LOCAL_IP
   - Or update `.env` file

3. **Restart servers:**
   - Django dev server
   - Expo dev server

---

## Quick Commands

```bash
# Find your IP (Windows)
ipconfig | Select-String "IPv4"

# Find your IP (Mac/Linux)
ifconfig | grep "inet "

# Start Django
cd Propertprodjango/dev && ./start_dev.ps1

# Start Expo
cd mobile-v1 && npm start

# Clear cache and restart Expo
cd mobile-v1 && npm start -- --clear

# Check which API URL is being used
# Look for console logs: 🌐 API Base URL: ...
```

---

## Testing Checklist

- [ ] Django running on `localhost:8000`
- [ ] Expo running on `localhost:8081`
- [ ] Console shows correct API URL
- [ ] Login works on web
- [ ] Login works on simulator/device
- [ ] API calls return data (not CORS errors)

---

## Related Documentation

- `Propertprodjango/EXPO_DJANGO_DEV_CONFIG.md` - Django configuration
- `mobile-v1/EXPO_SDK_54_UPGRADE.md` - Recent SDK upgrade
- `mobile-v1/SIMPLIFIED_LOGIN_FLOW.md` - Login system docs

---

**Status**: ✅ Configured for Development  
**Updated**: November 4, 2025

