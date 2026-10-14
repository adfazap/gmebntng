/* =====================================================
   game.js  -  LOGIKA GAME
   Biasanya kamu tidak perlu mengubah file ini.
   Yang diubah ada di data.js (gambar, level, teks).
   ===================================================== */

/* ---------- Elemen di halaman ---------- */
const $ = (selector) => document.querySelector(selector);

const world       = $('#world');
const bg          = $('#bg');
const boxRintangan = $('#rintangan');
const boxPapan     = $('#papan');
const gate        = $('#gate');
const gateText    = $('#gateText');
const player      = $('#player');
const tubuh       = $('#tubuh');
const NAMA_BAGIAN = ['tanganKiri', 'kakiKiri', 'badan', 'kakiKanan', 'tanganKanan'];
const bagian = {
  tanganKiri:  $('#pTanganKiri'),
  kakiKiri:    $('#pKakiKiri'),
  badan:       $('#pBadan'),
  kakiKanan:   $('#pKakiKanan'),
  tanganKanan: $('#pTanganKanan')
};
const flash       = $('#flash');
const stage       = $('#stage');
const efekMerah   = $('#kena');
const teksKena    = $('#teksKena');
const pengejar    = $('#pengejar');
const pengejarImg = $('#pengejarImg');

const halamanAwal = $('#welcome');
const hud         = $('#hud');
const banner      = $('#banner');
const toastEl     = $('#toast');

// Semua panel yang muncul di atas game
const panel = {
  how:    $('#how'),
  pause:  $('#pause'),
  select: $('#select'),
  info:   $('#info'),
  over:   $('#over'),
  ending: $('#ending')
};


/* ---------- Status game ---------- */
let state = 'welcome';   // welcome, running, finishing, cutscene, paused, dead, panel
let stateSebelumJeda = 'running';

let level = null;        // data level yang sedang dimainkan
let daftarRintangan = [];

let jarak = 0;           // sudah berlari sejauh apa
let kecepatan = 0;
let tinggiLompat = 0;    // tinggi karakter dari tanah
let kecLompat = 0;       // kecepatan naik/turun saat lompat
let nyawa = 3;
let kebal = 0;           // waktu kebal sesudah tabrakan (detik)
let remAkhir = 0;        // pengereman di dekat gerbang
let sudahGantiBaju = false;   // sudah ganti pakaian di level ini?
let pengejarCfg = null;       // data pengejar level ini
let xPengejar = 0;            // posisi depan pengejar di layar
let fasePengejar = 0;
let waktuMati = 0;            // jeda singkat saat pengejar menerkam
let mundur = 0;               // sisa jarak terpental ke belakang setelah menabrak
let tersandung = 0;           // lama pose tersandung (detik)
let jumlahLompat = 0;         // sudah berapa kali melompat sejak terakhir menyentuh permukaan
let alas = 0;                 // tinggi permukaan tempat karakter berdiri (0 = tanah, lebih besar = di atas rintangan)

let skala = 1;           // pembesaran layar
let lebarDunia = 800;    // lebar layar dalam piksel desain
let posisiKarakter = 150;
let tinggiTanah = 60;

const selesai = new Set();          // id map yang sudah selesai
const KUNCI = 'lari-promed-v1';     // nama simpanan di browser
const HP_TEGAK = '(orientation:portrait) and (max-width:700px)';   // HP dipegang tegak


/* ---------- Simpan dan muat progres ---------- */
function muatProgres() {
  try {
    const data = JSON.parse(localStorage.getItem(KUNCI) || '[]');
    data.forEach((id) => {
      if (MAPS.some((m) => m.id === id)) selesai.add(id);
    });
  } catch (e) {}
}
function simpanProgres() {
  try { localStorage.setItem(KUNCI, JSON.stringify([...selesai])); } catch (e) {}
}


/* ---------- Ukuran layar ----------
   Dunia game tingginya selalu 400, lalu diperbesar supaya memenuhi layar. */
function ukurLayar() {
  skala = window.innerHeight / ATUR.tinggiLayar;
  lebarDunia = window.innerWidth / skala;
  posisiKarakter = Math.max(110, Math.min(220, lebarDunia * 0.2));
  tinggiTanah = ATUR.tinggiLayar * ATUR.tanah / 100;

  world.style.width = lebarDunia + 'px';
  world.style.transform = 'scale(' + skala + ')';
  world.style.setProperty('--tanah', tinggiTanah + 'px');
  letakKarakter();
  world.style.setProperty('--tinggi-karakter', ATUR.tinggiKarakter + 'px');

  if (!panel.select.hidden) gambarGaris();
  if (window.matchMedia(HP_TEGAK).matches) jeda();   // HP tegak: jeda dulu
}


// Di menu awal karakter berlari di sisi kanan supaya tidak tertutup kartu menu
function letakKarakter() {
  const x = (state === 'welcome') ? lebarDunia * 0.78 : posisiKarakter;
  world.style.setProperty('--px', x + 'px');
}


/* ---------- Panel ---------- */
function tutupPanel() {
  for (const nama in panel) panel[nama].hidden = true;
}
function bukaPanel(nama, tombolFokus) {
  tutupPanel();
  // pesan "putar HP" hanya perlu muncul saat bermain atau jeda, bukan di pilihan map dan info
  if (nama !== 'pause') document.body.classList.remove('bermain');
  panel[nama].hidden = false;
  const tombol = panel[nama].querySelector(tombolFokus || 'button');
  if (tombol) tombol.focus({ preventScroll: true });
}
function adaPanelTerbuka() {
  return Object.values(panel).some((p) => !p.hidden);
}
function tampilPesan(teks) {
  toastEl.textContent = teks;
  toastEl.hidden = false;
  clearTimeout(tampilPesan.timer);
  tampilPesan.timer = setTimeout(() => { toastEl.hidden = true; }, 3400);
}


/* ---------- Karakter ---------- */
function pakaiKarakter(jenis) {          // jenis: 'kaos' atau 'jas'
  const k = KARAKTER[jenis];
  const utuh = typeof k === 'string';    // true kalau pakaian ini hanya satu gambar utuh
  NAMA_BAGIAN.forEach((nama) => {
    const img = bagian[nama];
    if (utuh && nama !== 'badan') { img.hidden = true; return; }
    img.hidden = false;
    img.src = utuh ? k : k[nama];
  });
}

// Lebar karakter mengikuti rasio gambar badan
bagian.badan.addEventListener('load', () => {
  const rasio = bagian.badan.naturalWidth / bagian.badan.naturalHeight;
  if (rasio) tubuh.style.width = (ATUR.tinggiKarakter * rasio) + 'px';
});

// Pasang titik putar tangan dan kaki
function pasangSendi() {
  for (const nama in SENDI) {
    bagian[nama].style.transformOrigin = SENDI[nama].x + '% ' + SENDI[nama].y + '%';
  }
}

/* Gerak tangan dan kaki.
   rasio    : 1 = lari penuh, 0 = berdiri diam (dipakai saat mengerem)
   diUdara  : true kalau sedang lompat */
let fase = 0;
const sudut = { tanganKiri: 0, tanganKanan: 0, kakiKiri: 0, kakiKanan: 0 };
let miring = 0;                          // kemiringan badan (derajat)

function gerakKarakter(dt, rasio, diUdara, sandung) {
  fase += dt * GERAK.langkah * rasio;
  const ayun = Math.sin(fase);
  const kuat = Math.min(1, rasio * 2);   // ayunan mengecil saat melambat

  let target;
  if (sandung) target = GERAK.tersandung;        // baru menabrak
  else if (diUdara) target = GERAK.lompat;       // sedang melompat
  else target = {                                // berlari
    tanganKanan: -ayun * GERAK.ayunTangan * kuat,
    tanganKiri:   ayun * GERAK.ayunTangan * kuat,
    kakiKanan:    ayun * GERAK.ayunKaki * kuat,
    kakiKiri:    -ayun * GERAK.ayunKaki * kuat
  };

  const halus = Math.min(1, dt * 20);    // gerak menuju target dengan halus
  for (const nama in sudut) {
    sudut[nama] += (target[nama] - sudut[nama]) * halus;
    bagian[nama].style.transform = 'rotate(' + sudut[nama].toFixed(1) + 'deg)';
  }
  const naik = diUdara ? 0 : Math.abs(ayun) * GERAK.goyangBadan * kuat;
  miring += ((sandung ? GERAK.tersandung.miring : 0) - miring) * halus;
  tubuh.style.transform = 'translateY(' + (-naik).toFixed(1) + 'px) rotate(' + miring.toFixed(1) + 'deg)';
}


/* ---------- Pengejar ---------- */
function pasangPengejar(cfg) {
  pengejarCfg = cfg || null;
  if (!cfg) { pengejar.hidden = true; return; }
  pengejarImg.src = cfg.gambar;
  pengejar.style.width = cfg.lebar + 'px';
  pengejar.style.height = cfg.tinggi + 'px';
  pengejar.style.bottom = 'calc(var(--tanah) + ' + (cfg.melayang || 0) + 'px)';
  pengejar.hidden = false;
  xPengejar = targetPengejar();
  gambarPengejar();
}

// Posisi depan pengejar di layar: makin sedikit nyawa, makin dekat ke karakter
function targetPengejar() {
  if (nyawa <= 0) return posisiKarakter + 14;          // tertangkap
  if (state === 'finishing') return -60;               // dekat gerbang: pengejar tertinggal
  const hilang = (ATUR.nyawa - nyawa) / Math.max(1, ATUR.nyawa - 1);
  return posisiKarakter * (0.3 + 0.5 * hilang);
}

function gerakPengejar(dt) {
  if (!pengejarCfg) return;
  const cepat = (nyawa <= 0) ? 8 : 3;                  // menerkam lebih cepat
  xPengejar += (targetPengejar() - xPengejar) * Math.min(1, dt * cepat);
  fasePengejar += dt * 10;
  gambarPengejar();
}

function gambarPengejar() {
  if (!pengejarCfg) return;
  const a = Math.sin(fasePengejar);
  let gerak;
  if (pengejarCfg.gerak === 'melayang') gerak = 'translateY(' + (a * 14).toFixed(1) + 'px)';
  else if (pengejarCfg.gerak === 'guling') gerak = 'rotate(' + ((fasePengejar * 40) % 360).toFixed(0) + 'deg)';
  else gerak = 'translateY(' + (-Math.abs(a) * 8).toFixed(1) + 'px) rotate(' + (a * 3).toFixed(1) + 'deg)';
  pengejarImg.style.transform = gerak;
  pengejar.style.transform = 'translateX(' + (xPengejar - pengejarCfg.lebar).toFixed(1) + 'px)';
}


/* ---------- Membuat rintangan ---------- */
// Membuat daftar posisi rintangan dari titik "mulai" sampai "akhir"
function acakRintangan(mulai, akhir, kecepatanLevel, jenisBoleh, rapat, boleh2Sekaligus) {
  const hasil = [];
  let x = mulai;
  while (x < akhir) {
    const nama = jenisBoleh[Math.floor(Math.random() * jenisBoleh.length)];
    const r = RINTANGAN[nama];
    hasil.push({ x: x, w: r.w, h: r.h, gambar: r.gambar });
    let akhirRintangan = x + r.w;
    // kadang dua rintangan berdempetan
    if (boleh2Sekaligus && r.w <= 46 && Math.random() < 0.14) {
      hasil.push({ x: akhirRintangan + 26, w: r.w, h: r.h, gambar: r.gambar });
      akhirRintangan += 26 + r.w;
    }
    x = akhirRintangan + kecepatanLevel * rapat * (0.95 + Math.random() * 0.8);
  }
  return hasil;
}

function buatLevelProlog() {
  const p = PROLOG;
  const daftar = acakRintangan(850, p.gantiBajuDi - 450, p.kecepatan, p.rintangan, 1.15, false)
    .concat(acakRintangan(p.gantiBajuDi + 650, p.panjang - 700, p.kecepatan, p.rintangan, 1.1, false));
  return { jenis: 'prolog', nama: p.nama, bg: p.bg, kecepatan: p.kecepatan,
           panjang: p.panjang, gantiBajuDi: p.gantiBajuDi, rintangan: daftar, papan: p.papan || [], warna: p.warna,
           pengejar: p.pengejar };
}

function buatLevelMap(nomor) {
  const m = MAPS[nomor];
  return { jenis: 'map', nomor: nomor, nama: m.nama, bg: m.bg, kecepatan: m.kecepatan,
           panjang: m.panjang, pengejar: m.pengejar, papan: m.papan || [], warna: m.warna,
           rintangan: acakRintangan(900, m.panjang - 700, m.kecepatan, m.rintangan, m.rapat, true) };
}

function pasangRintangan(daftar) {
  boxRintangan.innerHTML = '';
  daftarRintangan = daftar;
  daftar.forEach((o) => {
    const el = document.createElement('div');
    el.className = 'rintangan';
    el.style.width = o.w + 'px';
    el.style.height = o.h + 'px';
    el.style.backgroundImage = 'url(' + o.gambar + ')';
    boxRintangan.appendChild(el);
    o.el = el;
  });
}


/* ---------- Background: satu gambar panjang, tidak diulang ---------- */
let lebarBgTerpasang = 0;
let lebarBg = 0;          // lebar gambar background level (piksel desain); 0 = belum dimuat / mode menu

// loop = true  : menu awal (gambar diulang terus, karena menu tidak punya ujung)
// loop = false : level (gambar ditampilkan sekali dari awal sampai akhir level)
function pasangBg(url, loop) {
  bg.style.backgroundImage = 'url(' + url + ')';
  bg.style.backgroundRepeat = loop ? 'repeat-x' : 'no-repeat';
  lebarBg = 0;
  lebarBgTerpasang = 0;
  bg.style.backgroundSize = '';
  if (loop) return;
  const img = new Image();
  img.onload = () => {
    if (bg.style.backgroundImage.indexOf(url) === -1) return;   // level sudah berganti
    lebarBg = img.naturalWidth * ATUR.tinggiLayar / img.naturalHeight;
  };
  img.src = url;
}

/* ---------- Papan informasi di pinggir jalan ---------- */
let daftarPapan = [];

function buatEl(tag, kelas, teks) {
  const el = document.createElement(tag);
  if (kelas) el.className = kelas;
  if (teks) el.textContent = teks;          // textContent: tanda & dan < di teks aman
  return el;
}

function pasangPapan(daftar, panjang, warna) {
  boxPapan.innerHTML = '';
  daftarPapan = [];
  const n = daftar ? daftar.length : 0;
  if (!n) return;
  const awal = 850, akhir = Math.max(awal, panjang - 1000);
  daftar.forEach((p, i) => {
    const lebar = p.lebar || 360;
    const x = (p.x !== undefined) ? p.x : (n > 1 ? awal + (akhir - awal) * i / (n - 1) : (awal + akhir) / 2);
    const el = buatEl('div', 'papan');
    el.style.width = lebar + 'px';
    el.style.setProperty('--warna', p.warna || warna || '#0f5c75');
    const kartu = buatEl('div', 'kartu');
    const kepala = buatEl('div', 'kepala');
    if (p.label) kepala.appendChild(buatEl('small', '', p.label));
    if (p.judul) kepala.appendChild(buatEl('b', '', p.judul));
    kartu.appendChild(kepala);
    const badan = buatEl('div', 'badan');
    if (p.isi) badan.appendChild(buatEl('p', '', p.isi));
    if (p.tag && p.tag.length) {
      const baris = buatEl('div', 'tags');
      if (p.labelTag) baris.appendChild(buatEl('em', '', p.labelTag));
      p.tag.forEach((t) => baris.appendChild(buatEl('span', 'tag', t)));
      badan.appendChild(baris);
    }
    kartu.appendChild(badan);
    el.appendChild(kartu);
    boxPapan.appendChild(el);
    daftarPapan.push({ x: x, w: lebar, el: el });
  });
}


/* ---------- Memulai level ---------- */
function mulaiLevel(data) {
  level = data;
  jarak = 0;
  kecepatan = data.kecepatan;
  tinggiLompat = 0;
  kecLompat = 0;
  nyawa = ATUR.nyawa;
  kebal = 0;
  mundur = 0;
  tersandung = 0;
  alas = 0;
  jumlahLompat = 0;
  sudahGantiBaju = data.jenis !== 'prolog';   // ganti pakaian hanya terjadi di prolog

  pasangBg(data.bg, false);
  pakaiKarakter(data.jenis === 'prolog' ? 'kaos' : 'jas');
  player.classList.remove('air', 'blink', 'spin');
  pasangRintangan(data.rintangan);
  pasangPapan(data.papan, data.panjang, data.warna);
  pasangPengejar(data.pengejar);

  gateText.textContent = data.jenis === 'prolog' ? 'PILIH MAP' : 'INFO PEMINATAN';
  gate.hidden = false;

  $('#namaLevel').textContent = data.nama;
  gambarNyawa();

  tutupPanel();
  halamanAwal.hidden = true;
  hud.hidden = false;
  banner.hidden = true;
  document.body.classList.add('bermain');
  state = 'running';
  letakKarakter();

  const awas = data.pengejar ? 'Awas, ' + data.pengejar.nama + ' mengejarmu! ' : '';
  tampilPesan(awas + (data.jenis === 'prolog'
    ? 'Ketuk layar atau tekan Spasi untuk melompat'
    : 'Lompati rintangan sampai gerbang informasi'));

  if (window.matchMedia(HP_TEGAK).matches) jeda();   // HP masih tegak: tunggu diputar dulu
}

// Latar menu awal: lari santai tanpa rintangan
function tampilMenuAwal() {
  level = null;
  jarak = 0;
  tinggiLompat = 0;
  pasangBg(PROLOG.bg, false);
  pakaiKarakter('kaos');
  player.classList.remove('air', 'blink', 'spin');
  pasangRintangan([]);
  pasangPapan([], 0);
  pasangPengejar(null);
  gate.hidden = true;
  tutupPanel();
  hud.hidden = true;
  banner.hidden = true;
  halamanAwal.hidden = false;
  document.body.classList.remove('bermain');
  state = 'welcome';
  letakKarakter();
  $('#btnLanjut').hidden = selesai.size === 0;
  $('#btnLanjut').textContent = 'Lanjutkan (' + selesai.size + '/' + MAPS.length + ')';
}

function ulangiLevel() {
  mulaiLevel(level.jenis === 'prolog' ? buatLevelProlog() : buatLevelMap(level.nomor));
}


/* ---------- Lompat, tabrakan, jeda ---------- */
function lompat() {
  if (state !== 'running' && state !== 'finishing') return;

  const diUdara = tinggiLompat > alas + 1;
  if (!diUdara) {                          // lompatan pertama: dari tanah atau dari atas rintangan
    jumlahLompat = 1;
    kecLompat = ATUR.lompat;
    tinggiLompat = alas + 0.01;
    return;
  }

  // Sedang di udara: lompat lagi (lompat ganda) kalau jatahnya masih ada
  if (jumlahLompat === 0) jumlahLompat = 1;      // jatuh dari tepi rintangan dihitung sudah lompat sekali
  if (jumlahLompat >= ATUR.lompatMaks) return;
  jumlahLompat++;
  kecLompat = ATUR.lompatKedua;                  // dorongan baru ke atas
  mainkanKelas(tubuh, 'salto', 500);             // karakter berputar
}

function gambarNyawa() {
  $('#nyawa').textContent = '♥'.repeat(nyawa) + '♡'.repeat(ATUR.nyawa - nyawa);
}

// Memutar animasi CSS: pasang kelas, lalu lepas lagi setelah selesai
function mainkanKelas(el, nama, ms) {
  el.classList.remove(nama);
  void el.offsetWidth;                  // supaya animasi yang sama bisa diputar ulang
  el.classList.add(nama);
  clearTimeout(el['t_' + nama]);
  el['t_' + nama] = setTimeout(() => el.classList.remove(nama), ms);
}

function tampilTeksTabrak() {
  const daftar = ATUR.teksTabrak;
  teksKena.textContent = daftar[Math.floor(Math.random() * daftar.length)];
  teksKena.style.left = posisiKarakter + 'px';
  mainkanKelas(teksKena, 'on', 800);
}

/* Dipanggil SEKALI tiap karakter menabrak rintangan (o = rintangan yang ditabrak).
   Mau menambah efek lain? Taruh di bagian "EFEK TABRAKAN" di bawah. */
function saatTabrak(o) {
  nyawa--;
  kebal = 1.3;                          // beberapa detik tidak kena lagi
  kecepatan = 0;                        // berhenti mendadak
  mundur = ATUR.mundurTabrak;           // terpental ke belakang
  tersandung = 0.55;                    // pose tersandung
  gambarNyawa();

  /* ===== EFEK TABRAKAN ===== */
  mainkanKelas(stage, 'getar', 400);    // layar bergetar
  mainkanKelas(efekMerah, 'on', 500);   // pinggiran layar memerah
  mainkanKelas(o.el, 'goyang', 450);    // rintangan bergoyang
  tampilTeksTabrak();                   // teks "Aduh!" muncul
  try { if (navigator.vibrate) navigator.vibrate(80); } catch (e) {}   // HP bergetar
  /* ========================= */

  if (nyawa <= 0) {
    state = 'dead';
    waktuMati = 0.8;                    // pengejar menerkam dulu, baru panel muncul
  }
}

function tampilGameOver() {
  const nama = level.pengejar ? level.pengejar.nama : 'Pengejar';
  $('#overTeks').textContent = nama + ' berhasil menangkapmu. Coba lagi, waktu lompat yang tepat lebih penting daripada cepat.';
  $('#btnPilihLain').hidden = level.jenis === 'prolog';
  bukaPanel('over', '#btnCoba');
}

function jeda() {
  if (state !== 'running' && state !== 'finishing') return;
  stateSebelumJeda = state;
  state = 'paused';
  bukaPanel('pause', '#btnLanjutMain');
}
function lanjutDariJeda() {
  tutupPanel();
  state = stateSebelumJeda;
}


/* ---------- Ganti pakaian (hanya di prolog) ---------- */
function gantiPakaian() {
  state = 'cutscene';
  sudahGantiBaju = true;
  banner.hidden = false;
  player.classList.add('spin');

  setTimeout(() => {                 // di tengah putaran: ganti gambar + kilat putih
    pakaiKarakter('jas');
    flash.classList.add('on');
    setTimeout(() => flash.classList.remove('on'), 80);
  }, 550);

  setTimeout(() => {                 // selesai: lanjut lari
    banner.hidden = true;
    player.classList.remove('spin');
    kebal = 0.6;
    state = 'running';
  }, 1500);
}


/* ---------- Update tiap frame ---------- */
function update(dt) {
  if (state === 'welcome') {          // menu awal: background jalan pelan
    jarak += 150 * dt;
    gerakKarakter(dt, 0.6, false);
    gambar();
    return;
  }
  if (state === 'cutscene') {         // saat ganti pakaian: lari di tempat
    gerakKarakter(dt, 0.5, false);
    gerakPengejar(dt);
    return;
  }
  if (state === 'dead') {             // pengejar menerkam, lalu panel "Tertangkap" muncul
    gerakPengejar(dt);
    waktuMati -= dt;
    if (waktuMati <= 0) { state = 'panel'; tampilGameOver(); }
    return;
  }
  if (state !== 'running' && state !== 'finishing') return;

  // waktu efek
  if (kebal > 0) kebal -= dt;
  player.classList.toggle('blink', kebal > 0);
  if (tersandung > 0) tersandung -= dt;

  if (state === 'running') {
    // terpental ke belakang setelah menabrak, lalu berlari lagi pelan-pelan
    if (mundur > 0) {
      const geser = Math.min(mundur, 500 * dt);
      jarak = Math.max(0, jarak - geser);
      mundur -= geser;
    }
    if (mundur <= 0 && tersandung <= 0.25 && kecepatan < level.kecepatan) {
      kecepatan = Math.min(level.kecepatan, kecepatan + level.kecepatan * 2 * dt);
    }
    jarak += kecepatan * dt;

    // Rintangan itu padat: tidak bisa ditembus, tapi bisa dilompati dan diinjak
    alas = 0;
    const setengah = ATUR.lebarTabrak / 2;
    for (const o of daftarRintangan) {
      const kiri = posisiKarakter + (o.x - jarak);
      const tumpang = kiri + o.w - 6 > posisiKarakter - setengah &&
                      kiri + 6 < posisiKarakter + setengah;
      if (!tumpang) continue;

      if (tinggiLompat >= o.h - 8) {            // karakter berada di atas rintangan
        alas = Math.max(alas, o.h);
        continue;
      }
      jarak = Math.min(jarak, o.x - setengah + 6);   // tertahan di depan rintangan
      kecepatan = 0;
      if (kebal <= 0) saatTabrak(o);                 // pertama kali menabrak: picu efek
    }

    if (level.jenis === 'prolog' && !sudahGantiBaju && jarak >= level.gantiBajuDi) {
      gantiPakaian();
    } else if (jarak >= level.panjang - 260) {
      // dekat gerbang: mulai mengerem
      state = 'finishing';
      const sisa = Math.max(60, level.panjang - 70 - jarak);
      remAkhir = kecepatan * kecepatan / (2 * sisa);
    }
  } else if (state === 'finishing') {
    alas = 0;
    kecepatan = Math.max(0, kecepatan - remAkhir * dt);
    jarak += kecepatan * dt;
    if (kecepatan <= 6 && tinggiLompat === 0) {
      kecepatan = 0;
      state = 'panel';
      levelSelesai();
    }
  }

  // fisika lompat (bisa mendarat di atas rintangan)
  if (tinggiLompat > alas || kecLompat > 0) {
    kecLompat -= ATUR.gravitasi * dt;
    tinggiLompat += kecLompat * dt;
  }
  if (tinggiLompat <= alas && kecLompat <= 0) {
    tinggiLompat = alas;
    kecLompat = 0;
    jumlahLompat = 0;                            // mendarat: jatah lompat pulih lagi
  }

  gerakPengejar(dt);
  gerakKarakter(dt, kecepatan / level.kecepatan, tinggiLompat > alas + 2, tersandung > 0);
  gambar();
  const persen = Math.min(1, jarak / level.panjang) * 100;
  $('#progres').style.width = persen + '%';
}

// Memindahkan semua elemen sesuai posisi terbaru
function gambar() {
  // Background = SATU gambar panjang, tidak diulang. Bergerak 1:1 dengan tanah.
  let geserBg = jarak;
  if (lebarBg) {
    let lebarPakai = lebarBg;
    if (level && ATUR.bgRegang === true && lebarBg < level.panjang + lebarDunia) {
      lebarPakai = Math.round(level.panjang + lebarDunia);   // opsi: dilebarkan paksa (bisa melar)
    }
    if (lebarPakai !== lebarBgTerpasang) {
      lebarBgTerpasang = lebarPakai;
      bg.style.backgroundSize = (lebarPakai === lebarBg) ? 'auto 100%' : lebarPakai + 'px 100%';
    }
    geserBg = Math.min(jarak, Math.max(0, lebarPakai - lebarDunia));   // berhenti di ujung gambar
  }
  bg.style.backgroundPositionX = (-geserBg) + 'px';

  for (const o of daftarRintangan) {
    const x = posisiKarakter + (o.x - jarak);
    const kelihatan = x > -150 && x < lebarDunia + 150;
    o.el.style.display = kelihatan ? 'block' : 'none';
    if (kelihatan) o.el.style.transform = 'translateX(' + x + 'px)';
  }
  for (const p of daftarPapan) {
    const x = posisiKarakter + (p.x - jarak);
    const kelihatan = x > -p.w - 40 && x < lebarDunia + 40;
    p.el.style.display = kelihatan ? 'block' : 'none';
    if (kelihatan) p.el.style.transform = 'translateX(' + x + 'px)';
  }
  if (level) {
    gate.style.transform = 'translateX(' + (posisiKarakter + level.panjang - jarak) + 'px)';
  }
  player.style.transform = 'translate(-50%,' + (-tinggiLompat) + 'px)';
}


/* ---------- Alur setelah level selesai ---------- */
function levelSelesai() {
  if (level.jenis === 'prolog') bukaPilihMap();
  else bukaInfo(level.nomor);
}

function bukaInfo(nomor) {
  const m = MAPS[nomor];
  $('#infoNama').textContent = m.nama;
  $('#infoBand').style.background = m.warna;
  const pem = $('#infoPeminatan');
  pem.textContent = m.peminatan || '';
  pem.hidden = !m.peminatan;
  $('#infoPengantar').textContent = m.pengantar;
  const ul = $('#infoBelajar');
  ul.innerHTML = '';
  m.belajar.forEach((b) => ul.appendChild(buatEl('li', '', b)));
  const st = m.studio;
  $('#infoStudio').hidden = !st;
  if (st) {
    $('#infoStudioDeskripsi').textContent = st.deskripsi || '';
    $('#infoStudioCore').textContent = st.core ? 'Core Stream: ' + st.core : '';
    $('#infoStudioCore').hidden = !st.core;
    $('#infoStudioPeran').textContent = st.peran || '';
    $('#infoStudioFokus').textContent = st.fokus || '';
  }
  $('#infoKarier').textContent = m.karier || '';
  $('#infoKarierBox').hidden = !m.karier;
  $('#btnSelesaiLevel').dataset.nomor = nomor;
  state = 'panel';
  bukaPanel('info', '#btnSelesaiLevel');
}

function bukaEnding() {
  $('#endDaftar').innerHTML = MAPS.map((m) => '<li>' + m.nama + '</li>').join('');
  state = 'panel';
  bukaPanel('ending', '#btnDariAwal');
}


/* ---------- Pilih map (bagan bercabang) ---------- */
const CENTANG = '<svg class="chk" viewBox="0 0 100 100" aria-hidden="true">' +
  '<polygon points="4,52 20,44 38,66 92,4 100,10 40,98" fill="#e8902a" stroke="#0b0907" stroke-width="4" stroke-linejoin="round"/></svg>';

function kotakMap(nomor) {
  const m = MAPS[nomor];
  const sudah = selesai.has(m.id);
  return '<button class="node ' + (sudah ? 'done' : '') + '" data-nomor="' + nomor + '"' +
    ' style="background-image:url(' + (m.peta || m.bg) + ')" aria-label="' + m.nama + '">' +
    '<span class="lbl">' + m.nama + '</span>' + (sudah ? CENTANG : '') + '</button>';
}

function bukaPilihMap() {
  const semua = selesai.size === MAPS.length;

  $('#kolAwal').innerHTML =
    '<div class="node done static" style="background-image:url(' + (PROLOG.peta || PROLOG.bg) + ')">' +
    '<span class="lbl">Prolog</span>' + CENTANG + '</div>';
  $('#kol1').innerHTML = kotakMap(0) + kotakMap(1);
  $('#kol2').innerHTML = kotakMap(2) + kotakMap(3) + kotakMap(4);
  $('#kolAkhir').innerHTML =
    '<button class="node final ' + (semua ? 'done' : 'locked') + '" data-akhir="1"' +
    ' style="background-image:url(' + ASET.bgEnding + ')">' +
    '<span class="lbl">Ending' + (semua ? '' : ' · ' + selesai.size + '/' + MAPS.length) + '</span></button>';

  $('#selHitung').textContent = selesai.size + ' / ' + MAPS.length + ' selesai';
  $('#selPetunjuk').textContent = semua
    ? 'Semua map selesai. Buka ending, atau mainkan map mana pun lagi.'
    : 'Pilih satu peminatan untuk dimainkan. Urutannya bebas.';

  state = 'panel';
  toastEl.hidden = true;
  bukaPanel('select', '.node:not(.static):not(.locked)');
  gambarGaris();
  requestAnimationFrame(gambarGaris);
}

// Garis oranye penghubung antar kotak
function gambarGaris() {
  const kotak = $('#bracket');
  const svg = $('#garis');
  const lebar = kotak.clientWidth, tinggi = kotak.clientHeight;
  svg.setAttribute('viewBox', '0 0 ' + lebar + ' ' + tinggi);
  svg.setAttribute('width', lebar);
  svg.setAttribute('height', tinggi);

  const tegak = window.matchMedia('(max-width:700px)').matches;   // HP tegak: kolom jadi baris
  const dasar = kotak.getBoundingClientRect();

  function titik(el, keluar) {
    const r = el.getBoundingClientRect();
    const x = r.left - dasar.left, y = r.top - dasar.top;
    if (tegak) return { x: x + r.width / 2, y: keluar ? y + r.height : y };
    return { x: keluar ? x + r.width : x, y: y + r.height / 2 };
  }
  function semuaKotak(idKolom) {
    return Array.from(document.querySelectorAll(idKolom + ' .node'));
  }

  let d = '';
  function hubungkan(dari, ke) {
    dari.forEach((a) => ke.forEach((b) => {
      const p = titik(a, true), q = titik(b, false);
      d += 'M' + p.x.toFixed(1) + ' ' + p.y.toFixed(1) + 'L' + q.x.toFixed(1) + ' ' + q.y.toFixed(1);
    }));
  }
  hubungkan(semuaKotak('#kolAwal'), semuaKotak('#kol1'));
  hubungkan(semuaKotak('#kol1'), semuaKotak('#kol2'));
  hubungkan(semuaKotak('#kol2'), semuaKotak('#kolAkhir'));

  svg.innerHTML =
    '<path d="' + d + '" fill="none" stroke="#0b0907" stroke-width="16" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="#c9772b" stroke-width="9" stroke-linecap="round"/>' +
    '<path d="' + d + '" fill="none" stroke="#f0b266" stroke-width="2" stroke-dasharray="7 11" stroke-linecap="round"/>';
}


/* ---------- Layar penuh ---------- */
function layarPenuh() {
  try {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (el.requestFullscreen) {
      const p = el.requestFullscreen();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {}
}
function masukLayarPenuh() {
  try {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) {
      const p = el.requestFullscreen();
      if (p && p.catch) p.catch(() => {});
    }
  } catch (e) {}
}


/* ---------- Tombol-tombol ---------- */
$('#btnMain').onclick = () => {
  masukLayarPenuh();
  mulaiLevel(buatLevelProlog());
};
$('#btnLanjut').onclick = () => {
  masukLayarPenuh();
  mulaiLevel(buatLevelProlog());   // hanya untuk menyiapkan latar di belakang pilihan map
  pasangRintangan([]);
  pakaiKarakter('jas');
  bukaPilihMap();
};
$('#btnCara').onclick = () => bukaPanel('how', '#btnMengerti');
$('#btnMengerti').onclick = () => tutupPanel();
$('#btnLayarPenuh').onclick = layarPenuh;
$('#btnLayarPenuh2').onclick = layarPenuh;

$('#btnJeda').onclick = jeda;
$('#btnLanjutMain').onclick = lanjutDariJeda;
$('#btnUlangi').onclick = ulangiLevel;
$('#btnMenu').onclick = tampilMenuAwal;

$('#btnCoba').onclick = ulangiLevel;
$('#btnPilihLain').onclick = bukaPilihMap;

$('#btnSelesaiLevel').onclick = function () {
  selesai.add(MAPS[+this.dataset.nomor].id);
  simpanProgres();
  if (selesai.size === MAPS.length) bukaEnding();
  else bukaPilihMap();
};
$('#btnDariAwal').onclick = () => { selesai.clear(); simpanProgres(); tampilMenuAwal(); };
$('#btnLihatLagi').onclick = bukaPilihMap;

// Klik kotak di bagan pilih map
$('#bracket').onclick = (e) => {
  const kotak = e.target.closest('.node');
  if (!kotak || kotak.classList.contains('static')) return;

  if (kotak.dataset.akhir) {                       // kotak Ending
    if (selesai.size === MAPS.length) bukaEnding();
    else $('#selPetunjuk').textContent =
      'Ending terbuka setelah kelima map selesai. Kurang ' + (MAPS.length - selesai.size) + ' map lagi.';
    return;
  }
  mulaiLevel(buatLevelMap(+kotak.dataset.nomor));
};


/* ---------- Kontrol: keyboard dan sentuh ---------- */
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' || e.code === 'KeyP') {
    if (state === 'paused') lanjutDariJeda();
    else if (!adaPanelTerbuka()) jeda();
    return;
  }
  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
    if (!halamanAwal.hidden || adaPanelTerbuka()) return;
    e.preventDefault();
    if (!e.repeat) lompat();
  }
});

// Ketuk di mana saja pada layar game untuk melompat
stage.addEventListener('pointerdown', (e) => {
  if (!halamanAwal.hidden) return;
  e.preventDefault();
  lompat();
});

// Jeda otomatis kalau pindah tab
document.addEventListener('visibilitychange', () => { if (document.hidden) jeda(); });
window.addEventListener('resize', ukurLayar);


/* ---------- Loop utama ---------- */
let waktuTerakhir = performance.now();
function loop(sekarang) {
  const dt = Math.min(0.033, (sekarang - waktuTerakhir) / 1000);
  waktuTerakhir = sekarang;
  update(dt);
  requestAnimationFrame(loop);
}

muatProgres();
pasangSendi();
ukurLayar();
tampilMenuAwal();
requestAnimationFrame(loop);
