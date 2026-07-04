# Family GPS — Native App (Android & iPhone)

Η εφαρμογή δουλεύει σε 2 λειτουργίες:

- **Web** (browser) → μόνο όσο είναι ανοιχτή η εφαρμογή στην οθόνη.
- **Native** (Android/iOS via Capacitor) → **background tracking** ακόμη κι όταν η οθόνη είναι κλειδωμένη.

Για να τη βάλεις "τοπικά" στα κινητά της οικογένειας (χωρίς Play Store / App Store):

---

## 1. Δημοσίευσε την web έκδοση

Πάτα **Publish** στο Lovable. Θα πάρεις ένα URL π.χ. `https://family-gps.lovable.app`.
Το native app θα φορτώνει από αυτό το URL, οπότε κάθε φορά που ανεβάζεις αλλαγές, ενημερώνονται όλα τα κινητά αυτόματα.

Άνοιξε το `capacitor.config.ts` και **πρόσθεσε το URL σου**:

```ts
const config: CapacitorConfig = {
  appId: 'com.family.gps',
  appName: 'Family GPS',
  webDir: 'dist/client',
  server: {
    url: 'https://family-gps.lovable.app', // ← το δικό σου URL
    androidScheme: 'https',
  },
};
```

---

## 2. Κατέβασε τον κώδικα τοπικά

```bash
git clone <το-repo-σου>
cd <το-project>
bun install
```

---

## 3. Πρόσθεσε Android και iOS

```bash
bunx cap add android
bunx cap add ios     # μόνο σε Mac
bunx cap sync
```

### Permissions

**Android** — άνοιξε `android/app/src/main/AndroidManifest.xml` και μέσα στο `<manifest>` βάλε:

```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
```

**iOS** — άνοιξε `ios/App/App/Info.plist` και βάλε:

```xml
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Η οικογένεια βλέπει την τοποθεσία σου στον χάρτη.</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>Η οικογένεια βλέπει την τοποθεσία σου στον χάρτη.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
</array>
```

---

## 4. Χτίσε & εγκατάστησε στο κινητό

### Android (χρειάζεσαι Android Studio)

```bash
bunx cap open android
```

Στο Android Studio: **Build → Build APK**. Στέλνεις το APK στα κινητά της οικογένειας, το ανοίγουν και το εγκαθιστούν (Settings → "Install unknown apps").

### iPhone (χρειάζεσαι Mac με Xcode + Apple Developer account $99/χρόνο για μόνιμη εγκατάσταση — αλλιώς free account αλλά ισχύει 7 μέρες)

```bash
bunx cap open ios
```

Στο Xcode: σύνδεσε το iPhone με καλώδιο → επίλεξε το ως target → πάτα **Run (▶)**.

---

## 5. Στο κινητό

Στο πρώτο άνοιγμα ζητάει άδεια τοποθεσίας — επίλεξε **"Always Allow"** (αλλιώς δεν δουλεύει background). Θα εμφανιστεί σταθερή ειδοποίηση "Family GPS ενεργό" που σημαίνει ότι στέλνει τοποθεσία.

---

## Μελλοντικές αλλαγές

Επειδή το app φορτώνει από το δημοσιευμένο URL, αρκεί να πατάς **Publish** στο Lovable — δεν χρειάζεται να ξαναχτίζεις APK/IPA.
