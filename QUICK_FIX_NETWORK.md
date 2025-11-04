# Quick Fix: Network Connection Issue

## The Problem

Your Expo app on iOS simulator was trying to connect to `192.168.0.17:8000` but couldn't reach it.

## The Solution

✅ **iOS Simulator can use `localhost` directly!**

Unlike physical devices, iOS Simulator shares the host's network, so it can access `localhost:8000` just like your browser.

---

## What Was Fixed

### 1. **API Configuration** (`mobile-v1/config/api.ts`)

**Before:**
```typescript
// Always used local IP for native apps
if (Platform.OS === 'web') {
  return 'http://localhost:8000/api';
}
return 'http://192.168.0.17:8000/api';  // ❌ Doesn't work in simulator
```

**After:**
```typescript
// iOS Simulator can use localhost!
if (Platform.OS === 'ios' || Platform.OS === 'web') {
  return 'http://localhost:8000/api';  // ✅ Works!
} else if (Platform.OS === 'android') {
  return 'http://10.0.2.2:8000/api';   // Android emulator special IP
}
return 'http://192.168.0.17:8000/api'; // Physical devices only
```

### 2. **Django Start Script** (`Propertprodjango/dev/start_dev.ps1`)

**Before:**
```powershell
python manage.py runserver localhost:8000  # ❌ Only binds to 127.0.0.1
```

**After:**
```powershell
python manage.py runserver 0.0.0.0:8000   # ✅ Accessible from anywhere
```

---

## How to Test

### Step 1: Restart Django Server

```powershell
cd Propertprodjango/dev
./start_dev.ps1
```

You should see:
```
Starting development server at http://0.0.0.0:8000/
```

### Step 2: Restart Expo App

In your Expo terminal, press:
```
r  ← Reload app
```

Or restart completely:
```bash
cd mobile-v1
npm start
# Press 'i' for iOS
```

### Step 3: Check Console Logs

You should now see:
```
🌐 API Base URL: http://localhost:8000/api  ← Changed from 192.168.0.17!
📱 Platform: ios
🔧 Development Mode: true

=== API REQUEST INTERCEPTOR START ===
API Request Interceptor - Full URL: http://localhost:8000/api/users/register/
=== API REQUEST INTERCEPTOR COMPLETE ===

=== API RESPONSE INTERCEPTOR SUCCESS ===  ← NEW! This means it worked!
API Response Interceptor - Status: 201
```

---

## Platform-Specific URLs

| Platform | URL | Why |
|----------|-----|-----|
| **iOS Simulator** | `http://localhost:8000/api` | Shares host network |
| **Android Emulator** | `http://10.0.2.2:8000/api` | Android's localhost alias |
| **Web Browser** | `http://localhost:8000/api` | Same machine |
| **Physical Device** | `http://192.168.0.17:8000/api` | Needs network IP |

---

## Troubleshooting

### Still Not Working?

**1. Is Django Actually Running?**
```powershell
# Check if port 8000 is listening
netstat -ano | findstr :8000
```

Should show:
```
TCP    0.0.0.0:8000    ...    LISTENING
```

**2. Can You Access Django in Browser?**
```
http://localhost:8000/admin/
```

Should show Django admin login.

**3. Check Expo Console for Errors**

Look for:
```
=== API RESPONSE INTERCEPTOR ERROR ===
```

If you see this, check what the error message says.

---

## Common Errors

### "Network request failed"
- Django is not running
- Django crashed (check terminal)
- Wrong port

### "Connection refused"
- Django listening on wrong interface
- Use `0.0.0.0:8000` not `localhost:8000`

### "Timeout"
- Firewall blocking (unlikely for localhost)
- Django is frozen/hung

---

## Testing Checklist

- [ ] Django running on `0.0.0.0:8000`
- [ ] Can access `http://localhost:8000/admin/` in browser
- [ ] Expo shows `http://localhost:8000/api` in console
- [ ] See "API RESPONSE INTERCEPTOR SUCCESS" in logs
- [ ] Registration/login works

---

## For Physical Device Testing

If you want to test on your actual iPhone later:

1. Both phone and computer on same WiFi
2. Find your computer's IP: `ipconfig`
3. The app will automatically use that IP
4. Make sure Windows Firewall allows port 8000

---

**Status**: ✅ Fixed  
**Last Updated**: November 4, 2025

