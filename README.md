# Veresiye Takip

Müşterilerinin veresiye ekmek hesabını tutan, çok kullanıcılı (Firebase bulut senkronlu),
Başak Ekmek Fırını sisteminden tamamen bağımsız yeni bir uygulama.

## Özellikler
- Müşteri ekle/düzenle/sil (arama kutusu)
- Ekmek türleri ve fiyatları (birden fazla tür tanımlanabilir)
- Veresiye kaydı: müşteri, ekmek türü, adet, tarih, "peşin ödendi mi" tiki
- Kayıtları sonradan düzenleme/silme
- Borçlar sekmesi: kim ne kadar borçlu, tahsilat alma
- Yeni müşteri eklerken "Geçmiş Bakiye" ile eski (kağıt) borçları da sisteme aktarabilme
- Offline çalışma (internet kesilse bile veri kaybolmaz, bağlantı gelince otomatik gönderilir)
- PWA — telefonlara "ana ekrana ekle" ile normal uygulama gibi kurulabilir

## Kurulum — Adım Adım

### 1) Yeni bir Firebase projesi oluştur
- [console.firebase.google.com](https://console.firebase.google.com) → **Add project**
- İsim: örn. `veresiye-takip`

### 2) Authentication'ı aç
- Sol menü **Build → Authentication → Get started**
- **Email/Password** sağlayıcısını **Enable** et, **Save**

### 3) Firestore Database oluştur
- Sol menü **Build → Firestore Database → Create database**
- **Production mode**, konum `eur3` (europe-west)

### 4) Güvenlik kuralı
Rules sekmesine şunu yapıştır, **Publish** et:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5) Kendine kullanıcı hesabı aç
- **Authentication → Users → Add user**
- E-posta: `patron@veresiyetakip.local` (istediğin başka bir isim de olur, sonuna mutlaka `@veresiyetakip.local` ekle)
- Bir şifre belirle

### 6) Config'i al ve bana gönder
- ⚙️ **Project settings → General** → aşağı in → **Your apps** → `</>` (Web) → **Register app**
- Çıkan `firebaseConfig = {...}` bloğunun tamamını bana yapıştır, `src/main.js` dosyasına işleyeyim

### 7) GitHub'a yükle
Bu klasördeki TÜM dosya ve klasörleri (package.json, index.html, src/, public/) bir GitHub reposunun köküne yükle.

### 8) Netlify'a bağla
- [netlify.com](https://netlify.com) → GitHub ile giriş yap
- **Add new site → Import an existing project** → reponu seç
- Build command: `npm run build`, Publish directory: `dist`
- Deploy et

### 9) Giriş yap
Netlify'ın verdiği adrese git, `patron` (ya da seçtiğin isim) + belirlediğin şifreyle giriş yap.
İlk girişte kullanıcı adın otomatik olarak sisteme eklenir — ayrıca bir yerde tanımlaman gerekmez.

## Kullanıcı ekleme
Yeni bir kişi (örn. tezgahtar) bu uygulamayı kullanacaksa:
1. Firebase Authentication'da onun için de `kullaniciadi@veresiyetakip.local` + şifre ile bir hesap aç
2. O kişi kendi kullanıcı adıyla (örn. sadece `kullaniciadi` yazarak) giriş yaptığında otomatik olarak sisteme eklenir — hepsi eşit yetkiye sahiptir (bu basit uygulamada rol ayrımı yok).
