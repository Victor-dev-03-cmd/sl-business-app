# Location Flow Diagram

## GPS Fix Waiting Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│                     getCurrentLocation()                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. CHECK GPS ENABLED                                            │
│     └─ hasServicesEnabledAsync()                                │
│        ├─ YES → Continue                                         │
│        └─ NO → Error: "GPS disabled"                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. REQUEST PERMISSION                                           │
│     └─ requestForegroundPermissionsAsync()                      │
│        ├─ GRANTED → Continue                                     │
│        ├─ DENIED → Error: "Permission denied"                   │
│        └─ PROMPT → Ask user                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. START RETRY LOOP (attempts = 1 to retryAttempts)           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. START GPS FIX WAITING (maxWaitTime = 15s)                  │
│                                                                  │
│     startTime = now                                              │
│     bestAccuracy = ∞                                             │
│     bestLocation = null                                          │
│                                                                  │
│     ┌─────────────────────────────────────────────┐            │
│     │  WHILE (now - startTime < maxWaitTime)      │            │
│     │  ─────────────────────────────────────────  │            │
│     │                                              │            │
│     │  ① Get location                             │            │
│     │     getCurrentPositionAsync()                │            │
│     │                                              │            │
│     │  ② Check accuracy                           │            │
│     │     currentAccuracy = location.accuracy      │            │
│     │                                              │            │
│     │  ③ Update best if better                    │            │
│     │     if (currentAccuracy < bestAccuracy)     │            │
│     │       bestAccuracy = currentAccuracy         │            │
│     │       bestLocation = location                │            │
│     │                                              │            │
│     │  ④ Check if good enough                     │            │
│     │     if (accuracy <= minAccuracy)            │            │
│     │       ✓ SUCCESS - Return location           │            │
│     │                                              │            │
│     │  ⑤ Wait before retry                        │            │
│     │     wait min(1s * attempts, 2s)             │            │
│     │                                              │            │
│     └─────────────────────────────────────────────┘            │
│                                                                  │
│     TIMEOUT → Return bestLocation (or null)                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  5. RETRY IF FAILED                                              │
│     └─ If attempt < retryAttempts                               │
│        └─ Wait 1s → Go to step 4                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. RETURN RESULT                                                │
│     ├─ Success → Location with good accuracy                    │
│     ├─ Partial → Best location found (with warning)             │
│     └─ Failure → null + error message                           │
└─────────────────────────────────────────────────────────────────┘
```

## Example Timeline

### Successful Acquisition (Good GPS Signal)

```
Time    Event
────────────────────────────────────────────────────────────
0.0s    User taps "Get Location"
0.1s    ✓ GPS enabled check passed
0.2s    ✓ Permission already granted
0.3s    📍 Attempt 1: Getting location...
        
1.0s    GPS reading 1: 85.3m accuracy (target: 30m)
        ❌ Too low - waiting...
        
3.0s    GPS reading 2: 42.1m accuracy (target: 30m)
        ❌ Still too low - waiting...
        
5.5s    GPS reading 3: 28.7m accuracy (target: 30m)
        ✓ GOOD! Accuracy met
        
5.6s    ✓ Return location (28.7m accuracy)
        Total time: 5.6 seconds
```

### Poor GPS Signal (Timeout)

```
Time    Event
────────────────────────────────────────────────────────────
0.0s    User taps "Get Location"
0.1s    ✓ GPS enabled check passed
0.2s    ✓ Permission already granted
0.3s    📍 Attempt 1: Getting location...
        
1.5s    GPS reading 1: 250m accuracy (target: 30m)
        ⚠ Very low - waiting...
        
4.0s    GPS reading 2: 180m accuracy (target: 30m)
        ⚠ Improving but still low - waiting...
        
7.5s    GPS reading 3: 120m accuracy (target: 30m)
        ⚠ Better but not enough - waiting...
        
11.0s   GPS reading 4: 95m accuracy (target: 30m)
        ⚠ Still not enough - waiting...
        
15.0s   ⏱ TIMEOUT (maxWaitTime reached)
        ⚠ Returning best location: 95m accuracy
        
16.0s   📍 Attempt 2: Getting location...
        (Retrying...)
        
18.0s   GPS reading 1: 75m accuracy (target: 30m)
        ⚠ Better - waiting...
        
21.0s   GPS reading 2: 48m accuracy (target: 30m)
        ⚠ Almost there - waiting...
        
24.0s   GPS reading 3: 29m accuracy (target: 30m)
        ✓ GOOD! Accuracy met on attempt 2
        
24.1s   ✓ Return location (29m accuracy)
        Total time: 24.1 seconds
```

## State Transitions

```
┌─────────────┐
│   IDLE      │  Initial state
└──────┬──────┘
       │ getCurrentLocation()
       ▼
┌─────────────┐
│  LOADING    │  isLoading: true
└──────┬──────┘
       │
       ├─ Success ──────────┐
       │                    ▼
       │             ┌─────────────┐
       │             │  SUCCESS    │  location + accuracy
       │             └─────────────┘
       │
       ├─ Low Accuracy ─────┐
       │                    ▼
       │             ┌─────────────┐
       │             │  WARNING    │  location + warning
       │             └─────────────┘
       │
       └─ Failure ──────────┐
                            ▼
                     ┌─────────────┐
                     │   ERROR     │  error message
                     └─────────────┘
```

## Permission Flow

```
                    ┌─────────────────────┐
                    │  App Starts         │
                    └──────────┬──────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Check Permission   │
                    │  getForegroundPerm  │
                    └──────────┬──────────┘
                               │
               ┌───────────────┼───────────────┐
               │               │               │
               ▼               ▼               ▼
        ┌──────────┐    ┌──────────┐   ┌──────────┐
        │ GRANTED  │    │ DENIED   │   │  PROMPT  │
        └────┬─────┘    └────┬─────┘   └────┬─────┘
             │               │               │
             │               │               ▼
             │               │        ┌──────────────┐
             │               │        │ User decides │
             │               │        └──────┬───────┘
             │               │               │
             │               │       ┌───────┴───────┐
             │               │       │               │
             │               │       ▼               ▼
             │               │  ┌─────────┐    ┌─────────┐
             │               │  │ GRANTED │    │ DENIED  │
             │               │  └────┬────┘    └────┬────┘
             │               │       │              │
             ▼               ▼       ▼              ▼
        ┌──────────────────────────────────────────────┐
        │              Get Location                     │
        └──────────────────────────────────────────────┘
             │                                   │
             ▼                                   ▼
      ┌──────────┐                        ┌──────────┐
      │ SUCCESS  │                        │  ERROR   │
      └──────────┘                        └──────────┘
```

## Accuracy Improvement Over Time

```
Accuracy
(meters)
   │
200├─●                                     Poor GPS Signal
   │  ╲
150├───●                                   (Indoor/Urban)
   │    ╲
100├─────●──────────────────────────
   │      ╲
 50├───────●─────●──────────────────      Acceptable
   │        ╲   ╱
   │         ● ●                           (Target met)
 20├──────────●─────────────────────
   │
   └────────────────────────────────────► Time (seconds)
      0   2   4   6   8  10  12  14

● = GPS reading
```

## Component Integration

```
┌─────────────────────────────────────────────────────────────┐
│  Your Component                                              │
│                                                               │
│  const { getCurrentLocation, accuracy } = useLocation({      │
│    enableHighAccuracy: true,                                 │
│    minAccuracy: 30,                                          │
│    maxWaitTime: 20000,                                       │
│  });                                                          │
│                                                               │
│  ┌─────────────────────────────────────────────────┐        │
│  │  User clicks button                              │        │
│  └────────────────┬────────────────────────────────┘        │
│                   ▼                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │  handleGetLocation()                             │        │
│  │  └─ await getCurrentLocation()                   │        │
│  └────────────────┬────────────────────────────────┘        │
│                   ▼                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │  useLocation Hook                                │        │
│  │  ├─ Check GPS enabled                            │        │
│  │  ├─ Request permission                           │        │
│  │  ├─ Wait for GPS fix                             │        │
│  │  ├─ Retry if needed                              │        │
│  │  └─ Return location                              │        │
│  └────────────────┬────────────────────────────────┘        │
│                   ▼                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │  expo-location (Native GPS)                      │        │
│  │  ├─ Android: FusedLocationProvider               │        │
│  │  └─ iOS: CLLocationManager                       │        │
│  └────────────────┬────────────────────────────────┘        │
│                   ▼                                           │
│  ┌─────────────────────────────────────────────────┐        │
│  │  Device GPS Hardware                             │        │
│  │  └─ Communicates with GPS satellites             │        │
│  └─────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Configuration Impact

### High Precision Config
```
minAccuracy: 20m
maxWaitTime: 30s
retryAttempts: 5

Timeline:
0s ──────── 30s ──────── 60s ──────── 90s
│           │            │             │
└─ Try 1 ───┴─ Try 2 ────┴─ Try 3 ─────┴─ etc.
   (30s)       (30s)        (30s)

Total possible time: 150s (2.5 min)
Target: ≤20m accuracy
```

### Fast Config
```
minAccuracy: 100m
maxWaitTime: 10s
retryAttempts: 2

Timeline:
0s ──── 10s ──── 20s
│       │        │
└─ Try 1 ┴─ Try 2
   (10s)    (10s)

Total possible time: 20s
Target: ≤100m accuracy (easier to achieve)
```

## Legend

```
✓  Success
✗  Failure
⚠  Warning
●  Data point
📍 Location request
⏱  Timeout
```
