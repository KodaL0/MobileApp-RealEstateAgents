# Network Troubleshooting Guide

## Issue: Expo App Not Reaching Django Server

### Your Current Logs:
```
✅ API Base URL: http://192.168.0.17:8000/api
✅ Request being prepared
❌ NO RESPONSE (success or error)
```

This means the request is timing out or not reaching Django.

---

## Diagnostic Steps

### Step 1: Verify Django is Running

**Check if Django is actually running:**
```powershell
# In PowerShell
netstat -ano | findstr :8000
```

**Expected output:**
```
TCP    0.0.0.0:8000           0.0.0.0:0              LISTENING       12345
```

**If nothing shows:** Django is NOT running. Start it:
```bash
cd Propertprodjango/dev
./start_dev.ps1
```

---

### Step 2: Test Django from Your Computer

**Open browser on your computer:**
```
http://localhost:8000/admin/
```

**Should see:** Django admin login page

**If it doesn't work:** Django is not running or has an error.

---

### Step 3: Test Django from iOS Simulator

**iOS Simulator CAN use localhost!** iOS simulator shares the host network.

**Update your config:**

Edit `mobile-v1/config/api.ts`, line 20-32:

```typescript
const getApiBaseUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  if (__DEV__) {
    // iOS Simulator CAN use localhost!
    return `http://localhost:${DEV_PORT}/api`;
  }
  return 'https://api.propertpro.com/api';
};
```

**Why?** iOS Simulator shares the same network as your Mac, so `localhost` works!

---

### Step 4: Check Django is Listening on All Interfaces

**Current Django start command:**
```powershell
python manage.py runserver localhost:8000
```

**Problem:** This only listens on `127.0.0.1`, not accessible from network.

**Solution:** Make Django listen on all interfaces:

Edit `Propertprodjango/dev/start_dev.ps1`:
```powershell
# OLD:
python manage.py runserver localhost:8000

# NEW:
python manage.py runserver 0.0.0.0:8000
```

This makes Django accessible from:
- `localhost:8000` (your computer)
- `192.168.0.17:8000` (network IP)

---

### Step 5: Test Network Connectivity from Simulator

**Add a simple test in your app:**

Create `mobile-v1/app/test-network.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TestNetwork() {
  const [result, setResult] = useState('Testing...');

  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test 1: Can we reach Django?
        const response = await fetch('http://localhost:8000/admin/', {
          method: 'GET',
        });
        
        if (response.ok) {
          setResult('✅ SUCCESS! Django is reachable');
        } else {
          setResult(`❌ Django returned: ${response.status}`);
        }
      } catch (error: any) {
        setResult(`❌ ERROR: ${error.message}`);
      }
    };

    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <Text style={styles.result}>{result}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  result: {
    fontSize: 16,
    textAlign: 'center',
  },
});
```

**Navigate to test:** `exp://localhost:8081/test-network`

---

### Step 6: Check Firewall (If Using Local IP)

**Windows Firewall may block port 8000:**

```powershell
# Allow port 8000 in Windows Firewall
New-NetFirewallRule -DisplayName "Django Dev Server" -Direction Inbound -LocalPort 8000 -Protocol TCP -Action Allow
```

---

## Quick Fix: Use localhost for iOS Simulator

**The simplest solution for iOS Simulator:**

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">mobile-v1/config/api.ts
