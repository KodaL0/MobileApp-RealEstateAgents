# Network Error Diagnosis

## The Error

```
API Response Interceptor - Error message: Network Error
API Response Interceptor - Error status: undefined
API Response Interceptor - Error data: undefined
```

**This means:** The request is **not reaching Django at all**. It's timing out or failing before making a connection.

---

## Diagnostic Checklist

### ✅ Step 1: Is Django Running?

**Check your Django terminal:**
```
Starting development server at http://0.0.0.0:8000/
```

**If you DON'T see this:**
```bash
cd Propertprodjango/dev
./start_dev.ps1
```

**If Django crashed, you'll see Python errors in the terminal.**

---

### ✅ Step 2: Can You Access Django in Browser?

**On your Mac, open browser:**
```
http://localhost:8000/admin/
```

**Expected:** Django admin login page

**If this doesn't work:** Django is not running properly!

---

### ✅ Step 3: Check What URL Expo is Using

**Look for this in Expo logs:**
```
🌐 API Base URL: http://localhost:8000/api
📱 Platform: ios
```

**If you see `192.168.0.17` instead of `localhost`:**
The fix I made didn't reload. Clear cache and restart:

```bash
# In Expo terminal, press:
r  ← Reload
# Or
Shift+R  ← Clear cache and reload
```

---

### ✅ Step 4: Test Direct Fetch from Simulator

**Add this test to verify connectivity:**

Create `mobile-v1/app/test-api.tsx`:
```typescript
import { useEffect, useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';

export default function TestAPI() {
  const [result, setResult] = useState('Not tested yet');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');
    
    try {
      console.log('Testing connection to: http://localhost:8000/admin/');
      
      const response = await fetch('http://localhost:8000/admin/', {
        method: 'GET',
        headers: {
          'Accept': 'text/html',
        },
      });
      
      console.log('Response status:', response.status);
      console.log('Response OK:', response.ok);
      
      if (response.ok) {
        const text = await response.text();
        setResult(`✅ SUCCESS!\nStatus: ${response.status}\nGot ${text.length} bytes`);
      } else {
        setResult(`❌ Django returned error: ${response.status}`);
      }
    } catch (error: any) {
      console.error('Fetch error:', error);
      setResult(`❌ ERROR: ${error.message}\n\nThis means iOS simulator cannot reach localhost:8000`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Test</Text>
      <Text style={styles.result}>{result}</Text>
      <Button 
        title="Test Again" 
        onPress={testConnection}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  result: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
});
```

**Then navigate to:** `http://localhost:8081/test-api`

---

### ✅ Step 5: Check Django Logs

**In your Django terminal, you should see:**
```
[04/Nov/2025 10:00:00] "POST /api/users/register/ HTTP/1.1" ...
```

**If you DON'T see any requests:**
Django is not receiving the requests at all.

---

## Common Causes & Solutions

### Cause 1: Django Not Running
**Symptom:** Can't access `http://localhost:8000/admin/` in browser

**Solution:**
```bash
cd Propertprodjango/dev
./start_dev.ps1
```

---

### Cause 2: Django Crashed
**Symptom:** Django terminal shows Python errors

**Solution:** Fix the Python error and restart Django

---

### Cause 3: Wrong Port
**Symptom:** Django running on different port

**Solution:** Check Django terminal for actual port:
```
Starting development server at http://0.0.0.0:XXXX/
```

Update `mobile-v1/config/api.ts`:
```typescript
const DEV_PORT = 'XXXX';  // Change to actual port
```

---

### Cause 4: iOS Simulator Network Issue
**Symptom:** Browser works, iOS simulator doesn't

**Solution:** Try restarting iOS Simulator:
1. Close simulator
2. In Expo terminal press: `i` (reopens simulator)

---

### Cause 5: DNS/Host Resolution Issue
**Symptom:** "localhost" not resolving

**Solution:** Try using `127.0.0.1` instead:

Edit `mobile-v1/config/api.ts`:
```typescript
if (Platform.OS === 'ios' || Platform.OS === 'web') {
  return `http://127.0.0.1:${DEV_PORT}/api`;  // Use IP instead
}
```

---

## Quick Debug Commands

### Check if Django port is listening:
```powershell
netstat -ano | findstr :8000
```

**Expected:**
```
TCP    0.0.0.0:8000    ...    LISTENING
```

### Check current API URL in app:
Look for console log:
```
🌐 API Base URL: http://localhost:8000/api
```

### Force reload Expo app:
Press in Expo terminal:
```
r          ← Reload
Shift+R    ← Clear cache and reload
```

---

## Next Steps

1. ✅ **Verify Django is running** - Check `http://localhost:8000/admin/` in browser
2. ✅ **Check Expo is using localhost** - Look for `🌐 API Base URL` in logs
3. ✅ **Create test-api.tsx** - Test direct fetch to Django
4. ✅ **Check Django logs** - See if requests are arriving
5. ✅ **Try 127.0.0.1** - If localhost doesn't work

---

## Report Back

After checking these, report:
1. ✅ Django running? (Check browser `localhost:8000/admin/`)
2. ✅ What URL is Expo using? (Check `🌐 API Base URL` log)
3. ✅ Test API result? (Create test-api.tsx and navigate to it)
4. ✅ Django receiving requests? (Check Django terminal for logs)

This will help pinpoint the exact issue!

