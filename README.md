# İlaç Mümessili Eğitim Simülasyonu - POC

Bu POC, senaryo seçimi sonrası sohbet tabanlı bir doktor simülasyonu sunar. İlk etapta ses yoktur; ileride STT/TTS eklenecektir.

## Gereksinimler
- Node.js 18+
- Bir Gemini API anahtarı (`GEMINI_API_KEY`)

## Kurulum (Windows PowerShell)
1. Dosyaları bu klasöre çıkarın.
2. Ortam değişkenlerini ayarlayın:
   - `.env.example` dosyasını `.env` olarak kopyalayın ve `GEMINI_API_KEY` değerini girin.
   - Alternatif: PowerShell ile kalıcı ayar: `setx GEMINI_API_KEY "<ANAHTAR>"`
3. Bağımlılıkları yükleyin:
   ```powershell
   npm install
   ```
4. Çalıştırın:
   ```powershell
   npm start
   ```
5. Tarayıcıda açın: `http://localhost:3000`

## Yapı
- `index.html`, `styles/`, `scripts/`, `data/`: Frontend
- `server.js`: Express sunucu ve API
- `providers/`: LLM sağlayıcıları (Gemini, OpenAI için hazırlık)
- `routes/`: REST uçları

## Çevresel Değişkenler
- `GEMINI_API_KEY`: Gemini erişim anahtarı
- `GEMINI_MODEL`: Varsayılan `gemini-1.5-pro`
- `PORT`: Varsayılan `3000`

## Notlar
- Bu POC, bellek olarak sunucu içi RAM kullanır. Prod için kalıcı depolama gerekir.


