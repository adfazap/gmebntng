/* =====================================================
   data.js  -  SEMUA YANG BIASANYA KAMU UBAH ADA DI SINI
   ===================================================== */


/* ---------- 1. GAMBAR KARAKTER ----------
   Karakter disusun dari 5 lapisan: badan (kepala + badan), tangan kiri, tangan kanan,
   kaki kiri, kaki kanan. Tangan dan kaki berayun dari sendinya, jadi geraknya mirip orang berlari.

   PENTING: ekspor kelima gambar dari kanvas yang SAMA (ukuran sama persis, mis. 200 x 400),
   dengan tiap bagian tetap di posisi aslinya dan sisanya transparan. Tidak perlu geser-geser lagi.

   Karakter menghadap ke kanan. "Kanan" = sisi yang dekat dengan kamera (tampil paling depan). */
const KARAKTER = {
  kaos: {                                        // sebelum ganti pakaian
    badan:       'assets/kaos/badan.png',
    tanganKiri:  'assets/kaos/tangan-kiri.png',
    tanganKanan: 'assets/kaos/tangan-kanan.png',
    kakiKiri:    'assets/kaos/kaki-kiri.png',
    kakiKanan:   'assets/kaos/kaki-kanan.png'
  },
  jas: {                                         // sesudah ganti jas dokter
    badan:       'assets/jas/badan.png',
    tanganKiri:  'assets/jas/tangan-kiri.png',
    tanganKanan: 'assets/jas/tangan-kanan.png',
    kakiKiri:    'assets/jas/kaki-kiri.png',
    kakiKanan:   'assets/jas/kaki-kanan.png'
  }
  // Kalau suatu pakaian hanya punya SATU gambar utuh (tanpa tangan kaki terpisah),
  // cukup tulis path-nya, contoh:  kaos: 'assets/karakter-kaos.png'
};

/* Titik putar (sendi) tiap bagian, dalam persen dari gambar: x = dari kiri, y = dari atas.
   Tangan: titik bahu. Kaki: titik pinggul. Kalau ayunan terlihat "terlepas" dari badan,
   geser angka ini sedikit demi sedikit. */
const SENDI = {
  tanganKiri:  { x: 32, y: 34 },
  tanganKanan: { x: 68, y: 34 },
  kakiKiri:    { x: 39, y: 65 },
  kakiKanan:   { x: 61, y: 65 }
};

/* Seberapa besar ayunan (satuan: derajat). Tanda minus = ke depan, plus = ke belakang. */
const GERAK = {
  langkah: 9,          // kecepatan langkah (makin besar makin cepat)
  ayunTangan: 50,      // ayunan tangan saat lari
  ayunKaki: 42,        // ayunan kaki saat lari
  goyangBadan: 5,      // badan naik-turun sedikit tiap langkah (piksel)
  lompat: {            // pose saat di udara
    tanganKiri: -150,
    tanganKanan: -150,
    kakiKiri: -38,
    kakiKanan: 32
  },
  tersandung: {        // pose sesaat setelah menabrak
    tanganKiri: -170,
    tanganKanan: -150,
    kakiKiri: 30,
    kakiKanan: -25,
    miring: -14        // badan condong ke belakang (derajat)
  }
};

/* Gambar kotak "Ending" di pilihan map */
const ASET = {
  bgEnding: 'assets/bg-ending.png'
};


/* ---------- 2. PENGATURAN GAME ----------
   Ukuran di bawah memakai "piksel desain": tinggi layar game selalu dianggap 400,
   lalu otomatis diperbesar mengikuti layar. */
const ATUR = {
  tinggiLayar: 400,       // jangan diubah
  tanah: 15,              // posisi tanah dari bawah background, dalam persen (0-100).
                          // Naikkan kalau kaki karakter terlalu rendah, turunkan kalau terlalu tinggi.
  bgRegang: false,        // false: gambar background tidak diubah ukurannya (rasio asli, tidak gepeng). Pakai gambar panjang.
                          // true: gambar yang lebih pendek dari level dilebarkan sepanjang level (bisa terlihat melar)
  tinggiKarakter: 130,    // tinggi karakter di layar
  lebarTabrak: 40,        // lebar area tabrak karakter (kecilkan kalau terasa terlalu sering kena)
  lompat: 760,            // kekuatan lompat (makin besar makin tinggi)
  lompatMaks: 2,          // jumlah lompatan berturut-turut sebelum mendarat (1 = tanpa lompat ganda, 3 = lompat tiga kali)
  lompatKedua: 680,       // kekuatan lompatan di udara (lompat ganda)
  gravitasi: 2200,        // gravitasi (makin besar makin cepat jatuh)
  nyawa: 3,               // jumlah nyawa tiap level
  mundurTabrak: 55,       // seberapa jauh karakter terpental ke belakang saat menabrak
  teksTabrak: ['Aduh!', 'Waduh!', 'Aw!']   // teks yang muncul saat menabrak
};


/* ---------- 3. RINTANGAN ----------
   w = lebar, h = tinggi (piksel desain). Tambah rintangan baru dengan menyalin satu baris. */
const RINTANGAN = {
  kotak:   { gambar: 'assets/rintangan-kotak.png',   w: 46, h: 46 },
  kerucut: { gambar: 'assets/rintangan-kerucut.png', w: 32, h: 44 },
  troli:   { gambar: 'assets/rintangan-troli.png',   w: 62, h: 48 },
  tong:    { gambar: 'assets/rintangan-tong.png',    w: 36, h: 50 },
  kursi:   { gambar: 'assets/rintangan-kursi.png',   w: 52, h: 50 }
};


/* ---------- PENGEJAR ----------
   Tiap level (prolog dan setiap map) punya satu pengejar yang berlari di belakang karakter.
   Setiap tabrakan membuat pengejar makin dekat. Kalau nyawa habis, karakter tertangkap.
   Format:
     nama     : nama yang ditampilkan ("Awas, ... mengejarmu!")
     gambar   : file gambar pengejar (menghadap ke kanan, latar transparan)
     lebar, tinggi : ukuran di layar
     melayang : tinggi dari tanah (0 = berlari di tanah, 60 = terbang)
     gerak    : 'lari' (naik-turun), 'melayang' (mengambang), atau 'guling' (berputar) */

/* ---------- 4. PROLOG (level pertama, ada ganti pakaian) ----------
   kecepatan   : kecepatan lari
   panjang     : panjang level (makin besar makin lama)
   gantiBajuDi : di titik berapa karakter berganti pakaian (harus lebih kecil dari panjang) */
const PROLOG = {
  nama: 'Prolog · Kampus',
  bg: 'assets/bg-prolog.png',       // background level: SATU gambar panjang, tidak diulang
  peta: 'assets/peta-prolog.png',   // gambar kotak di pilihan map (rasio 3 : 2), beda dari background
  kecepatan: 200,
  panjang: 4800,
  gantiBajuDi: 4400,
  rintangan: ['kotak', 'kerucut'],
  pengejar: { nama: 'Alarm kuliah', gambar: 'assets/pengejar-alarm.png', lebar: 150, tinggi: 150, melayang: 0, gerak: 'lari' }
};


/* ---------- 5. LIMA MAP PEMINATAN ----------
   Urutan di sini = urutan kotak di pilihan map (2 di kolom pertama, 3 di kolom kedua).
   rapat     : jarak antar rintangan. Makin kecil makin sulit (1 = santai, 0.85 = padat)
   warna     : warna judul di panel informasi
   Map 1 (KULS Creative) sudah berisi info studio yang sebenarnya. Map lain masih contoh:
   salin format map 1 (papan, peminatan, studio) untuk mengisinya. */
const MAPS = [
  {
    id: 'kuls',
    nama: 'KULS Creative',
    bg: 'assets/bg-kuls.png',
    peta: 'assets/peta-kuls.png',
    kecepatan: 200, panjang: 6200, rapat: 1.0,
    rintangan: ['kotak', 'tong'],
    warna: '#0f5c75',
    pengejar: { nama: 'Glitch sistem', gambar: 'assets/pengejar-glitch.png', lebar: 150, tinggi: 150, melayang: 30, gerak: 'melayang' },

    /* Papan informasi di pinggir jalan (infografis yang lewat saat berlari).
       Papan dipasang berurutan dan dibagi rata sepanjang level.
       label : tulisan kecil di atas judul      judul : judul papan
       isi   : teks singkat                       tag   : deretan label kecil di bawah teks
       labelTag : teks kecil sebelum tag (opsional)     lebar : lebar papan (bawaan 360) */
    papan: [
      { label: 'Peminatan', judul: 'Digital Advertising, Gig Media, & Gamification', lebar: 420,
        isi: 'Mengembangkan keterampilan manajerial dan teknis untuk menciptakan promosi produk, gig media, dan konsep gamifikasi.',
        tag: ['Perencanaan konten', 'Analisis brand & produk', 'Konsep aplikasi'] },
      { label: 'Studio', judul: 'KULS Creative',
        isi: 'Wadah kreatif mahasiswa Produksi Media UI konsentrasi Periklanan, Media Gig, dan Gamifikasi untuk belajar, berkembang, dan menciptakan proyek & konten kreatif yang positif dan berdampak, dari sisi strategi hingga kreatif.',
        labelTag: 'Core Stream', tag: ['Project Manager', 'Designer'] },
      { label: 'Peran Studio', judul: 'Wadah spesialisasi resmi',
        isi: 'Wadah spesialisasi resmi di Produksi Media UI yang mempercepat kompetensi mahasiswa untuk menguasai lanskap periklanan modern, baik di level strategis maupun eksekusi kreatif.' },
      { label: 'Fokus Studio', judul: 'Solusi komunikasi berdampak',
        isi: 'Berfokus pada pengembangan solusi komunikasi melalui penggalian human insight, perumusan strategi brand, dan produksi kampanye kreatif multiplatform yang berdampak nyata.' }
    ],

    /* Isi panel informasi di ujung map */
    peminatan: 'Digital Advertising, Gig Media, & Gamification',
    pengantar: 'Peminatan Digital Advertising, Gig Media, dan Gamifikasi Produksi Media Universitas Indonesia berfokus pada pengembangan keterampilan manajerial dan teknis dalam menciptakan promosi produk, gig media, dan konsep gamifikasi.',
    belajar: [
      'Perencanaan konten',
      'Analisis brand & produk',
      'Konsep aplikasi',
      'Dan aspek lainnya'
    ],
    studio: {
      deskripsi: 'KULS Creative merupakan studio yang menjadi wadah kreatif bagi para mahasiswa Produksi Media Universitas Indonesia konsentrasi Periklanan, Media Gig, dan Gamifikasi untuk bersama-sama belajar, berkembang, dan menciptakan proyek & konten kreatif yang positif dan berdampak dari sisi strategi hingga kreatif.',
      core: 'Project Manager & Designer',
      peran: 'Wadah spesialisasi resmi di Produksi Media UI yang mempercepat kompetensi mahasiswa untuk menguasai lanskap periklanan modern, baik di level strategis maupun eksekusi kreatif.',
      fokus: 'Berfokus pada pengembangan solusi komunikasi melalui penggalian human insight, perumusan strategi brand, dan produksi kampanye kreatif multiplatform yang berdampak nyata.'
    }
  },
  {
    id: 'komunitas',
    nama: 'Kesehatan Masyarakat',
    bg: 'assets/bg-komunitas.png',
    peta: 'assets/peta-komunitas.png',
    kecepatan: 340, panjang: 6400, rapat: 0.95,
    rintangan: ['kotak', 'kerucut'],
    warna: '#1f7a43',
    pengejar: { nama: 'Kawanan nyamuk', gambar: 'assets/pengejar-nyamuk.png', lebar: 150, tinggi: 150, melayang: 55, gerak: 'melayang' },
    papan: [
      { label: 'Peminatan', judul: '(isi nama peminatan)', isi: 'Isi infografis peminatan ini di data.js, bagian papan.' },
      { label: 'Studio', judul: '(isi nama studio)', isi: 'Isi infografis studio ini di data.js, bagian papan.' }
    ],
    pengantar: 'Fokusnya kesehatan populasi: mencegah penyakit, mempromosikan perilaku sehat, dan merancang program yang menjangkau seluruh komunitas, bukan hanya satu pasien.',
    belajar: [
      'Epidemiologi dan pemantauan penyakit',
      'Promosi kesehatan dan edukasi masyarakat',
      'Program puskesmas dan kebijakan kesehatan'
    ],
    karier: 'Puskesmas, dinas kesehatan, lembaga swadaya masyarakat, dan organisasi kesehatan global.'
  },
  {
    id: 'biomedik',
    nama: 'Biomedik dan Riset',
    bg: 'assets/bg-biomedik.png',
    peta: 'assets/peta-biomedik.png',
    kecepatan: 360, panjang: 6600, rapat: 0.92,
    rintangan: ['tong', 'kotak'],
    warna: '#5a46c2',
    pengejar: { nama: 'Virus raksasa', gambar: 'assets/pengejar-virus.png', lebar: 150, tinggi: 150, melayang: 0, gerak: 'guling' },
    papan: [
      { label: 'Peminatan', judul: '(isi nama peminatan)', isi: 'Isi infografis peminatan ini di data.js, bagian papan.' },
      { label: 'Studio', judul: '(isi nama studio)', isi: 'Isi infografis studio ini di data.js, bagian papan.' }
    ],
    pengantar: 'Peminatan untuk yang penasaran dengan mekanisme di balik penyakit dan pengobatan. Kamu belajar merancang penelitian, membaca data, dan menulis temuan secara ilmiah.',
    belajar: [
      'Metode penelitian dan statistik dasar',
      'Mekanisme penyakit di tingkat sel dan molekul',
      'Penulisan ilmiah dan etika riset'
    ],
    karier: 'Peneliti, dosen, serta peran di industri farmasi dan bioteknologi.'
  },
  {
    id: 'emergensi',
    nama: 'Gawat Darurat dan Trauma',
    bg: 'assets/bg-emergensi.png',
    peta: 'assets/peta-emergensi.png',
    kecepatan: 390, panjang: 6800, rapat: 0.88,
    rintangan: ['kerucut', 'troli'],
    warna: '#b82a3d',
    pengejar: { nama: 'Kobaran api', gambar: 'assets/pengejar-api.png', lebar: 160, tinggi: 170, melayang: 0, gerak: 'lari' },
    papan: [
      { label: 'Peminatan', judul: '(isi nama peminatan)', isi: 'Isi infografis peminatan ini di data.js, bagian papan.' },
      { label: 'Studio', judul: '(isi nama studio)', isi: 'Isi infografis studio ini di data.js, bagian papan.' }
    ],
    pengantar: 'Peminatan untuk situasi yang menuntut keputusan cepat: pasien yang datang tiba-tiba, kecelakaan, dan keadaan yang mengancam nyawa. Ketenangan dan kerja tim jadi kuncinya.',
    belajar: [
      'Penilaian cepat jalan napas, pernapasan, dan sirkulasi',
      'Resusitasi jantung paru dan penanganan trauma',
      'Kerja tim dan pengambilan keputusan di bawah tekanan'
    ],
    karier: 'Instalasi gawat darurat, layanan ambulans, dan tim penanggulangan bencana.'
  },
  {
    id: 'klinik',
    nama: 'Kedokteran Klinik',
    bg: 'assets/bg-klinik.png',
    peta: 'assets/peta-klinik.png',
    kecepatan: 410, panjang: 7000, rapat: 0.85,
    rintangan: ['troli', 'kursi'],
    warna: '#c2412d',
    pengejar: { nama: 'Antrean pasien', gambar: 'assets/pengejar-antrean.png', lebar: 170, tinggi: 150, melayang: 0, gerak: 'lari' },
    papan: [
      { label: 'Peminatan', judul: '(isi nama peminatan)', isi: 'Isi infografis peminatan ini di data.js, bagian papan.' },
      { label: 'Studio', judul: '(isi nama studio)', isi: 'Isi infografis studio ini di data.js, bagian papan.' }
    ],
    pengantar: 'Peminatan ini berfokus pada pelayanan langsung kepada pasien: menggali keluhan, memeriksa, menegakkan diagnosis, lalu menyusun terapi di poliklinik maupun ruang rawat inap.',
    belajar: [
      'Penalaran klinis, dari keluhan ke diagnosis kerja',
      'Komunikasi dengan pasien dan keluarga',
      'Tindakan medis dasar dan keselamatan pasien'
    ],
    karier: 'Dokter umum di rumah sakit atau klinik, atau lanjut spesialisasi seperti penyakit dalam, anak, dan bedah.'
  }
];
