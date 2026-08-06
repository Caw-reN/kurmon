# AGENTS CUSTOMIZATION RULES

## Desain & Kustomisasi UI (STRICT UI COMPLIANCE)
- **KONSISTENSI TAMPILAN KUSTOMISASI:** Ketika melakukan perbaikan bug, refactoring, atau penambahan fitur, **WAJIB TETAP MENGIKUTI TAMPILAN KUSTOMISASI WEB YANG ADA** (shadow, border-radius, warna, gradient, glassmorphism, typography, dan micro-animation).
- **BORDER RADIUS & SHADOW:** Selalu gunakan variabel radius (`--ui-radius`, `rounded-[var(--ui-radius-small)]`, `rounded-2xl`, `rounded-3xl`) serta shadow modern (`shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-xl`, `shadow-2xs`). Dilarang mengganti menjadi border kasar tanpa radius atau shadow datar tanpa style.
- **TEMA WARNA & PALET:** Gunakan CSS variable/skema HSL (`var(--ui-primary)`, `var(--ui-primary-hover)`, `bg-emerald-600`, `bg-teal-600`, `bg-slate-50`, backdrop-blur) yang padu. Dilarang memakai warna polos dasar (plain red, plain blue, plain green) yang merusak estetika premium web.
- **RESPONSIF DESKTOP & MOBILE:** Setiap perubahan UI WAJIB dioptimalkan dan diuji secara sempurna untuk desktop maupun mobile (layout grid `lg:grid-cols-...`, tabel `hidden md:block`, card mobile `md:hidden`).
- **LAYOUT & INTERAKSI:** Dilarang merusak atau menghilangkan elemen kustomisasi visual (badge, hero header, card KPI, hover tone) yang telah diterapkan sebelumnya saat melakukan perbaikan logika atau fitur.
