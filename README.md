# VIRUS_SLAYER.EXE

Brutalist file & URL security scanner — powered by VirusTotal API v3.

## Jalankan di lokal

```bash
npm install
npm run dev
```

Buka http://localhost:3000

Tanpa API key di `.env.local`, aplikasi otomatis pakai mock data (UI tetap hidup, tidak blank).

## Isi API Key asli (opsional)

1. Daftar gratis di https://www.virustotal.com/gui/my-apikey
2. Isi `.env.local`:
   ```
   VIRUSTOTAL_API_KEY=api_key_asli_kamu
   ```
3. Restart `npm run dev`

## Deploy ke Vercel

1. Push folder ini (isinya, bukan folder ini yang dibungkus lagi) ke repo GitHub baru:
   ```bash
   git init
   git add .
   git commit -m "init: VIRUS_SLAYER.EXE"
   git branch -M main
   git remote add origin https://github.com/USERNAME/virus-slayer.git
   git push -u origin main
   ```
2. Import repo di https://vercel.com/new
3. Di **Settings → Environment Variables**, tambahkan `VIRUSTOTAL_API_KEY` (scope Production + Preview + Development)
4. Deploy — Vercel otomatis jalanin `npm install` & `npm run build`

## Struktur

- `app/page.tsx` — UI utama (client component)
- `app/api/scan-url/route.ts` — scan URL via VirusTotal (server-side)
- `app/api/scan-file/route.ts` — scan file via VirusTotal (server-side, maks 32MB)
- `app/globals.css` — Tailwind v4 theme config (warna, shadow, animasi brutalist)
- `lib/utils.ts` — helper `cn()` dan `formatBytes()`
