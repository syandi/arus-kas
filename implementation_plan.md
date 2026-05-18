# Arsitektur Aplikasi Arus Kas (Cash Flow)

Dokumen ini berisi rancangan arsitektur dan rencana implementasi untuk aplikasi Arus Kas menggunakan stack yang diminta.

## User Review Required

> [!IMPORTANT]
> Mohon tinjau rancangan arsitektur di bawah ini. Apakah ada fitur spesifik (misalnya autentikasi, multi-user, atau export laporan) yang ingin ditekankan pada tahap awal?

## Open Questions

> [!TIP]
> 1. Apakah Anda ingin menggunakan tipe data tertentu untuk tabel D1 (misalnya UUID vs Auto Increment ID)?
> 2. Apakah Anda sudah memiliki rancangan warna/tema untuk UI dari shadcn-svelte (misalnya dark mode default)?

## 1. Desain Arsitektur (Unified SvelteKit & ElysiaJS)

Kita akan menggunakan pendekatan **Single Project / Monorepo Terpadu**, di mana Backend (ElysiaJS) akan tertanam (embedded) di dalam SvelteKit. Hal ini akan memastikan Frontend dan Backend berjalan pada port yang sama persis dan dideploy sebagai satu kesatuan di Cloudflare Workers.

### Komponen Utama:
*   **Frontend**: SvelteKit untuk routing halaman dan Server-Side Rendering (SSR).
*   **Backend API**: ElysiaJS akan menangani logika API. Elysia akan di-mount pada SvelteKit catch-all route (misalnya `src/routes/api/[...slugs]/+server.ts`).
*   **Type Safety**: Menggunakan fitur Elysia **Eden**, frontend SvelteKit akan memiliki End-to-End type safety saat memanggil API backend.
*   **Database**: Cloudflare D1 (SQLite Edge).
*   **ORM**: Drizzle ORM terhubung ke binding D1.
*   **UI/UX**: TailwindCSS dikombinasikan dengan `shadcn-svelte` untuk komponen interaktif yang premium dan responsif.
*   **Runtime & Dev**: Menggunakan `@cloudflare/vite-plugin` di `vite.config.ts`. Ini memastikan Svelte dev server berjalan menggunakan `workerd` (runtime asli Cloudflare), sehingga binding seperti `env.DB` (D1) dapat diakses langsung selama development tanpa proxy tambahan.

## 2. Struktur Direktori Proyek

```text
/
├── src/
│   ├── lib/
│   │   ├── server/
│   │   │   ├── api/            # Logika Backend ElysiaJS (Routes, Controllers)
│   │   │   │   └── index.ts    # Entry point Elysia app
│   │   │   └── db/             # Drizzle ORM Schema & DB Client
│   │   │       ├── schema.ts   # Definisi tabel (transactions, categories)
│   │   │       └── index.ts    # Inisialisasi koneksi D1
│   │   └── components/         # Komponen UI shadcn-svelte & kustom
│   ├── routes/
│   │   ├── api/
│   │   │   └── [...slugs]/
│   │   │       └── +server.ts  # Gateway penghubung SvelteKit ke Elysia
│   │   ├── dashboard/          # Halaman UI Arus Kas Frontend
│   │   └── +page.svelte        # Landing Page / Redirect ke Dashboard
├── drizzle/                    # File migrasi database
├── wrangler.toml               # Konfigurasi Cloudflare Workers & D1 Binding
├── vite.config.ts              # Konfigurasi Vite & @cloudflare/vite-plugin
└── tailwind.config.js          # Konfigurasi desain & styling UI
```

## 3. Skema Database (Drizzle ORM) Awal

Tabel utama yang dibutuhkan untuk aplikasi arus kas:
*   **`transactions`**:
    *   `id`: Integer Primary Key / UUID
    *   `amount`: Integer (Jumlah uang)
    *   `type`: Enum / String ('income' | 'expense')
    *   `category_id`: Relasi ke tabel kategori
    *   `description`: Text
    *   `date`: Timestamp (Waktu transaksi)
*   **`categories`**:
    *   `id`: Integer Primary Key
    *   `name`: String (Nama kategori, misal: "Gaji", "Makan")
    *   `type`: Enum / String ('income' | 'expense')

## 4. Rencana Implementasi Langkah demi Langkah

### Tahap 1: Setup Proyek & Konfigurasi Dasar
*   Inisialisasi project SvelteKit (`npx sv create`).
*   Instalasi dependensi TailwindCSS dan shadcn-svelte.
*   Konfigurasi `@cloudflare/vite-plugin` di `vite.config.ts` dan `@sveltejs/adapter-cloudflare`.
*   Setup `wrangler.toml` untuk local D1 database.

### Tahap 2: Setup Database & Backend API
*   Instalasi Drizzle ORM dan setup skema tabel.
*   Membuat migrasi awal database lokal (`wrangler d1 migrations`).
*   Inisialisasi ElysiaJS di `src/lib/server/api/index.ts`.
*   Mengaitkan ElysiaJS ke SvelteKit API route (`+server.ts`).
*   Membuat endpoint dasar: GET/POST `/api/transactions`.

### Tahap 3: Implementasi UI Frontend
*   Instalasi komponen UI `shadcn-svelte` (Button, Input, Table, Card, Dialog).
*   Membuat halaman `Dashboard` yang menampilkan ringkasan arus kas (Total Pemasukan, Total Pengeluaran, Saldo).
*   Membuat Data Table untuk melihat riwayat transaksi.
*   Membuat Form (Dialog/Modal) untuk menambah transaksi baru.

### Tahap 4: Integrasi End-to-End & Polishing
*   Menggunakan Elysia Eden di frontend untuk memanggil API transaksi.
*   Memastikan UI responsif dan menambahkan micro-animations (seperti hover effects).
*   Testing fungsionalitas keseluruhan.

## Verification Plan

### Automated Tests / Linting
*   Memastikan TypeScript build sukses tanpa error type.
*   Memastikan Vite dev server bisa berjalan menggunakan `@cloudflare/vite-plugin`.

### Manual Verification
*   **Dev Server**: Menjalankan `npm run dev` dan memastikan web terbuka di port yang sama, baik untuk UI maupun akses `/api/transactions`.
*   **Database**: Menambahkan transaksi pengeluaran dan pemasukan melalui form, lalu memverifikasi data tersimpan dan saldo terupdate secara real-time.
*   **UI/UX**: Memeriksa tampilan di mode mobile dan desktop untuk memastikan desain terkesan premium dan responsif.
