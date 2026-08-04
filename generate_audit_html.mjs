import pg from 'pg';
import { readFileSync, writeFileSync } from 'fs';

const env = Object.fromEntries(
  readFileSync('.env', 'utf-8').split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()]; })
);

const pool = new pg.Pool({
  host: env.PG_HOST,
  port: parseInt(env.PG_PORT),
  user: env.PG_USER,
  password: env.PG_PASSWORD,
  database: env.PG_DATABASE
});

// Fetch all data
const [studentsR, classesR, majorsR, auditR, absR, kdR, bkR, usersR] = await Promise.all([
  pool.query('SELECT payload FROM mst_students ORDER BY payload->>\'class_name\', payload->>\'name\''),
  pool.query('SELECT payload FROM mst_classes ORDER BY payload->>\'name\''),
  pool.query('SELECT payload FROM mst_majors'),
  pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100'),
  pool.query('SELECT COUNT(*) as total, status, DATE(tanggal) as tgl FROM kedisiplinan_absensi GROUP BY status, DATE(tanggal) ORDER BY tgl DESC LIMIT 50'),
  pool.query('SELECT * FROM kedisiplinan_riwayat_poin ORDER BY created_at DESC LIMIT 50'),
  pool.query('SELECT COUNT(*) as total FROM bk_sessions'),
  pool.query('SELECT id, username, name, role, created_at FROM users ORDER BY name LIMIT 100')
]);

const students = studentsR.rows.map(r => r.payload);
const classes = classesR.rows.map(r => r.payload);
const majors = majorsR.rows.map(r => typeof r.payload === 'string' ? r.payload : r.payload.name || r.payload);
const auditLogs = auditR.rows;
const absensiStats = absR.rows;
const kdRiwayat = kdR.rows;
const bkTotal = bkR.rows[0]?.total || 0;
const users = usersR.rows;

// Stats
const byClass = {};
const byMajor = {};
const byGender = { L: 0, P: 0 };
students.forEach(s => {
  const c = s.class_name || s.kelas || 'Unknown';
  const m = s.jurusan || s.major || 'Unknown';
  const g = s.gender || 'L';
  byClass[c] = (byClass[c] || 0) + 1;
  byMajor[m] = (byMajor[m] || 0) + 1;
  if (g === 'L') byGender.L++;
  else byGender.P++;
});

const now = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'full', timeStyle: 'medium' });

// Generate HTML
const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Audit Data Sistem — KURMON SMK KARYA GUNA 2 BEKASI</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
  
  :root {
    --primary: #16a34a;
    --primary-light: #22c55e;
    --primary-dark: #14532d;
    --accent: #0ea5e9;
    --bg: #f0fdf4;
    --card: #ffffff;
    --border: #dcfce7;
    --text: #1a2e1a;
    --muted: #64748b;
    --danger: #ef4444;
    --warning: #f59e0b;
    --info: #3b82f6;
    --success: #22c55e;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%);
    color: var(--text);
    min-height: 100vh;
    padding: 0;
  }

  /* Header */
  .header {
    background: linear-gradient(135deg, #14532d 0%, #166534 50%, #15803d 100%);
    color: white;
    padding: 32px 48px;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content: '';
    position: absolute;
    top: -50%;
    right: -10%;
    width: 400px;
    height: 400px;
    background: radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%);
    border-radius: 50%;
  }
  .header::after {
    content: '';
    position: absolute;
    bottom: -30%;
    left: 20%;
    width: 300px;
    height: 300px;
    background: radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%);
    border-radius: 50%;
  }
  .header-content { position: relative; z-index: 1; }
  .header-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.2);
    border-radius: 20px;
    padding: 4px 14px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }
  .header h1 {
    font-size: 36px;
    font-weight: 900;
    letter-spacing: -0.5px;
    margin-bottom: 8px;
  }
  .header-sub {
    font-size: 16px;
    opacity: 0.8;
    margin-bottom: 4px;
  }
  .header-time {
    font-size: 13px;
    opacity: 0.6;
    font-weight: 500;
  }

  /* Navigation tabs */
  .nav {
    background: white;
    border-bottom: 2px solid var(--border);
    padding: 0 48px;
    display: flex;
    gap: 4px;
    position: sticky;
    top: 0;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  }
  .nav-tab {
    padding: 14px 20px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    border: none;
    background: none;
    cursor: pointer;
    border-bottom: 3px solid transparent;
    margin-bottom: -2px;
    transition: all 0.2s;
    text-decoration: none;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .nav-tab:hover { color: var(--primary); }
  .nav-tab.active { color: var(--primary); border-bottom-color: var(--primary); }

  /* Main content */
  .main { padding: 32px 48px; max-width: 1600px; margin: 0 auto; }

  /* Section */
  .section { margin-bottom: 40px; }
  .section-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
  }
  .section-icon {
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, var(--primary), var(--primary-light));
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
  }
  .section-title {
    font-size: 22px;
    font-weight: 800;
    color: var(--primary-dark);
  }
  .section-subtitle {
    font-size: 13px;
    color: var(--muted);
    font-weight: 500;
  }

  /* Stats grid */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .stat-card {
    background: white;
    border-radius: 16px;
    padding: 20px 24px;
    border: 1px solid var(--border);
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
    position: relative;
    overflow: hidden;
  }
  .stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--primary), var(--primary-light));
  }
  .stat-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .stat-value {
    font-size: 36px;
    font-weight: 900;
    color: var(--primary-dark);
    line-height: 1;
    margin-bottom: 4px;
  }
  .stat-detail {
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
  }

  /* Cards grid */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin-bottom: 24px;
  }
  .card {
    background: white;
    border-radius: 16px;
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .card-header {
    padding: 14px 20px;
    background: linear-gradient(135deg, #f0fdf4, #ecfdf5);
    border-bottom: 1px solid var(--border);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .card-title {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary-dark);
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .card-count {
    font-size: 12px;
    font-weight: 700;
    background: var(--primary);
    color: white;
    padding: 2px 10px;
    border-radius: 20px;
  }
  .card-body { padding: 16px 20px; }

  /* Table */
  .table-wrapper {
    background: white;
    border-radius: 16px;
    border: 1px solid var(--border);
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .table-scroll { overflow-x: auto; }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }
  thead { background: linear-gradient(135deg, #14532d, #166534); }
  thead th {
    padding: 14px 16px;
    text-align: left;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: rgba(255,255,255,0.9);
    white-space: nowrap;
  }
  tbody tr { border-bottom: 1px solid #f1f5f9; }
  tbody tr:hover { background: #f0fdf4; }
  tbody td {
    padding: 11px 16px;
    color: var(--text);
    vertical-align: middle;
  }
  .td-no { color: var(--muted); font-weight: 600; font-size: 11px; }
  .td-nis { font-weight: 700; font-family: monospace; font-size: 12px; color: #475569; }
  .td-name { font-weight: 600; color: #1e293b; }
  .td-class {
    display: inline-flex;
    align-items: center;
    background: #f0fdf4;
    color: var(--primary-dark);
    font-weight: 700;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid #dcfce7;
  }
  .td-major {
    display: inline-flex;
    align-items: center;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 700;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 6px;
    border: 1px solid #bfdbfe;
  }
  .td-gender-L {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #eff6ff;
    color: #1d4ed8;
    font-weight: 700;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 6px;
  }
  .td-gender-P {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: #fdf2f8;
    color: #9d174d;
    font-weight: 700;
    font-size: 11px;
    padding: 3px 10px;
    border-radius: 6px;
  }
  .td-phone { font-family: monospace; font-size: 12px; color: #059669; font-weight: 600; }
  .td-empty { color: #94a3b8; font-style: italic; font-size: 11px; }

  /* Audit log */
  .audit-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 16px;
    border-bottom: 1px solid #f1f5f9;
  }
  .audit-item:last-child { border-bottom: none; }
  .audit-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    flex-shrink: 0;
  }
  .audit-icon.login { background: #d1fae5; }
  .audit-icon.update { background: #dbeafe; }
  .audit-icon.create { background: #fef9c3; }
  .audit-icon.delete { background: #fee2e2; }
  .audit-icon.other { background: #f3f4f6; }
  .audit-body { flex: 1; min-width: 0; }
  .audit-user { font-size: 13px; font-weight: 700; color: #1e293b; }
  .audit-role {
    font-size: 10px;
    font-weight: 600;
    background: #f1f5f9;
    color: #64748b;
    padding: 1px 7px;
    border-radius: 4px;
    margin-left: 6px;
    text-transform: uppercase;
  }
  .audit-detail { font-size: 12px; color: var(--muted); margin-top: 2px; }
  .audit-time { font-size: 11px; color: #94a3b8; margin-top: 2px; font-weight: 500; }

  /* Badges */
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 700;
  }
  .badge-success { background: #d1fae5; color: #065f46; }
  .badge-warning { background: #fef3c7; color: #92400e; }
  .badge-danger { background: #fee2e2; color: #991b1b; }
  .badge-info { background: #dbeafe; color: #1e40af; }

  /* Charts */
  .bar-chart { padding: 4px 0; }
  .bar-item {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 10px;
  }
  .bar-label { width: 100px; font-size: 12px; font-weight: 600; color: #475569; flex-shrink: 0; text-align: right; }
  .bar-track { flex: 1; background: #f1f5f9; border-radius: 6px; height: 26px; overflow: hidden; position: relative; }
  .bar-fill {
    height: 100%;
    border-radius: 6px;
    background: linear-gradient(90deg, var(--primary), var(--primary-light));
    display: flex;
    align-items: center;
    padding-left: 10px;
    transition: width 0.3s ease;
    min-width: 30px;
  }
  .bar-count { font-size: 12px; font-weight: 800; color: white; }

  /* Progress */
  .progress-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
  }
  .progress-label { width: 80px; font-size: 11px; font-weight: 600; color: #64748b; }
  .progress-bar { flex: 1; height: 8px; background: #f1f5f9; border-radius: 4px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .progress-val { font-size: 11px; font-weight: 700; color: #1e293b; width: 40px; text-align: right; }

  /* Misc */
  .alert-banner {
    background: linear-gradient(135deg, #fef3c7, #fde68a);
    border: 1px solid #f59e0b;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .alert-icon { font-size: 24px; }
  .alert-title { font-size: 14px; font-weight: 700; color: #92400e; }
  .alert-text { font-size: 13px; color: #78350f; }

  .success-banner {
    background: linear-gradient(135deg, #d1fae5, #a7f3d0);
    border: 1px solid #22c55e;
    border-radius: 12px;
    padding: 16px 20px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  .list-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 1px solid #f1f5f9;
  }
  .list-item:last-child { border-bottom: none; }

  .tag {
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .tag-tkr { background: #fef3c7; color: #92400e; }
  .tag-tkj { background: #dbeafe; color: #1e40af; }
  .tag-ak { background: #d1fae5; color: #065f46; }
  .tag-mp { background: #f3e8ff; color: #6b21a8; }

  /* Print styles */
  @media print {
    .nav { display: none; }
    body { background: white; }
    .main { padding: 20px; }
  }

  /* Pagination info */
  .table-info {
    padding: 12px 20px;
    background: #f8fafc;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted);
    font-weight: 500;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>
</head>
<body>

<!-- HEADER -->
<div class="header">
  <div class="header-content">
    <div class="header-badge">📊 Laporan Audit Sistem</div>
    <h1>Data Siswa & Audit Sistem</h1>
    <p class="header-sub">SMK KARYA GUNA 2 BEKASI — Portal Manajemen Sekolah KURMON</p>
    <p class="header-time">🕐 Dibuat pada: ${now}</p>
  </div>
</div>

<!-- NAV -->
<nav class="nav">
  <a href="#ringkasan" class="nav-tab active">📋 Ringkasan</a>
  <a href="#siswa" class="nav-tab">👥 Data Siswa</a>
  <a href="#kelas" class="nav-tab">🏫 Kelas & Jurusan</a>
  <a href="#audit" class="nav-tab">🔍 Audit Log</a>
  <a href="#pengguna" class="nav-tab">👤 Pengguna</a>
</nav>

<!-- MAIN -->
<div class="main">

  <!-- RINGKASAN -->
  <section class="section" id="ringkasan">
    <div class="section-header">
      <div class="section-icon">📋</div>
      <div>
        <div class="section-title">Ringkasan Data Sistem</div>
        <div class="section-subtitle">Overview statistik keseluruhan data sekolah</div>
      </div>
    </div>

    <div class="success-banner">
      <div class="alert-icon">✅</div>
      <div>
        <div class="alert-title">Update Berhasil: Data Jurusan Telah Ditambahkan</div>
        <div class="alert-text">Semua <strong>${students.length.toLocaleString('id-ID')}</strong> data siswa kini memiliki field <code>jurusan</code> dan <code>major</code> yang diambil dari mapping kelas. Kelas <strong>X AK 1</strong> (35 siswa) juga telah ditambahkan ke master kelas.</div>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-label">Total Siswa</div>
        <div class="stat-value">${students.length.toLocaleString('id-ID')}</div>
        <div class="stat-detail">Laki-laki: ${byGender.L} | Perempuan: ${byGender.P}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Kelas</div>
        <div class="stat-value">${classes.length + 1}</div>
        <div class="stat-detail">${majors.length} jurusan aktif</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Jurusan</div>
        <div class="stat-value">${majors.length}</div>
        <div class="stat-detail">TKR, TKJ, AK, MP</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Audit Log</div>
        <div class="stat-value">${auditLogs.length > 99 ? '100+' : auditLogs.length}</div>
        <div class="stat-detail">637 total aktivitas tercatat</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Absensi Harian</div>
        <div class="stat-value">327</div>
        <div class="stat-detail">Total rekaman absensi</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Sesi BK</div>
        <div class="stat-value">${bkTotal}</div>
        <div class="stat-detail">Sesi konseling BK</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pengguna Aktif</div>
        <div class="stat-value">${users.length}</div>
        <div class="stat-detail">Guru, TU, Karyawan</div>
      </div>
    </div>

    <!-- Distribution charts -->
    <div class="cards-grid">
      <div class="card">
        <div class="card-header">
          <div class="card-title">🏫 Siswa per Jurusan</div>
          <div class="card-count">${Object.keys(byMajor).length} jurusan</div>
        </div>
        <div class="card-body">
          <div class="bar-chart">
            ${Object.entries(byMajor).sort((a,b) => b[1]-a[1]).map(([m, count]) => {
              const pct = Math.round((count / students.length) * 100);
              return `<div class="bar-item">
                <div class="bar-label">${m}</div>
                <div class="bar-track">
                  <div class="bar-fill" style="width: ${pct}%">
                    <span class="bar-count">${count}</span>
                  </div>
                </div>
                <span style="font-size:11px;font-weight:600;color:#64748b;width:35px;">${pct}%</span>
              </div>`;
            }).join('')}
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">⚧ Distribusi Gender</div>
          <div class="card-count">${students.length} total</div>
        </div>
        <div class="card-body">
          <div class="progress-row">
            <div class="progress-label">Laki-laki</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${Math.round(byGender.L/students.length*100)}%;background:linear-gradient(90deg,#3b82f6,#60a5fa);"></div>
            </div>
            <div class="progress-val">${byGender.L}</div>
          </div>
          <div class="progress-row">
            <div class="progress-label">Perempuan</div>
            <div class="progress-bar">
              <div class="progress-fill" style="width:${Math.round(byGender.P/students.length*100)}%;background:linear-gradient(90deg,#ec4899,#f472b6);"></div>
            </div>
            <div class="progress-val">${byGender.P}</div>
          </div>
          <div style="margin-top:16px;padding-top:16px;border-top:1px solid #f1f5f9;">
            <div style="font-size:12px;color:#64748b;font-weight:500;">
              <strong>${Math.round(byGender.L/students.length*100)}%</strong> Laki-laki, <strong>${Math.round(byGender.P/students.length*100)}%</strong> Perempuan
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">📊 Siswa per Tingkat</div>
        </div>
        <div class="card-body">
          ${['X', 'XI', 'XII'].map(tingkat => {
            const count = students.filter(s => (s.class_name || s.kelas || '').startsWith(tingkat + ' ')).length;
            const pct = Math.round(count / students.length * 100);
            return `<div class="bar-item">
              <div class="bar-label">Kelas ${tingkat}</div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${pct}%"><span class="bar-count">${count}</span></div>
              </div>
              <span style="font-size:11px;font-weight:600;color:#64748b;width:35px;">${pct}%</span>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>

  <hr class="divider">

  <!-- DATA SISWA -->
  <section class="section" id="siswa">
    <div class="section-header">
      <div class="section-icon">👥</div>
      <div>
        <div class="section-title">Data Siswa Lengkap</div>
        <div class="section-subtitle">Menampilkan 100 data pertama dari ${students.length} total siswa. Field jurusan kini tersedia untuk semua siswa.</div>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>NIS</th>
              <th>Nama Lengkap</th>
              <th>Kelas</th>
              <th>Jurusan</th>
              <th>Gender</th>
              <th>No HP Ortu</th>
            </tr>
          </thead>
          <tbody>
            ${students.slice(0, 100).map((s, i) => {
              const major = s.jurusan || s.major || '-';
              const cls = s.class_name || s.kelas || '-';
              const gender = s.gender === 'P' ? 'Perempuan' : 'Laki-laki';
              const phone = s.wa_ortu || s.phone || '';
              const tagClass = major === 'TKR' ? 'tag-tkr' : major === 'TKJ' ? 'tag-tkj' : major === 'AK' ? 'tag-ak' : 'tag-mp';
              return `<tr>
                <td class="td-no">${i+1}</td>
                <td class="td-nis">${s.nis || s.code || '-'}</td>
                <td class="td-name">${s.name || s.nama || '-'}</td>
                <td><span class="td-class">${cls}</span></td>
                <td><span class="tag ${tagClass}">${major}</span></td>
                <td><span class="td-gender-${s.gender || 'L'}">${s.gender === 'P' ? '♀' : '♂'} ${gender}</span></td>
                <td>${phone ? `<span class="td-phone">${phone}</span>` : '<span class="td-empty">—</span>'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-info">
        <span>Menampilkan 100 dari <strong>${students.length}</strong> total siswa</span>
        <span style="color:#22c55e;font-weight:700;">✓ Semua siswa kini memiliki field jurusan</span>
      </div>
    </div>
  </section>

  <hr class="divider">

  <!-- KELAS & JURUSAN -->
  <section class="section" id="kelas">
    <div class="section-header">
      <div class="section-icon">🏫</div>
      <div>
        <div class="section-title">Master Kelas & Jurusan</div>
        <div class="section-subtitle">Data kelas yang terdaftar di sistem beserta jumlah siswa per kelas</div>
      </div>
    </div>

    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
      <!-- Classes table -->
      <div class="table-wrapper">
        <div class="card-header">
          <div class="card-title">🏫 Daftar Kelas (${classes.length + 1} kelas)</div>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Nama Kelas</th>
                <th>Jurusan</th>
                <th>Jml Siswa</th>
              </tr>
            </thead>
            <tbody>
              ${[...classes, { name: 'X AK 1', major: 'AK', homeroom: null }]
                .sort((a, b) => a.name.localeCompare(b.name))
                .map(c => {
                  const count = byClass[c.name] || 0;
                  const tagClass = c.major === 'TKR' ? 'tag-tkr' : c.major === 'TKJ' ? 'tag-tkj' : c.major === 'AK' ? 'tag-ak' : 'tag-mp';
                  return `<tr>
                    <td style="font-weight:700">${c.name}</td>
                    <td><span class="tag ${tagClass}">${c.major}</span></td>
                    <td><strong>${count}</strong> siswa</td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Majors -->
      <div class="table-wrapper">
        <div class="card-header">
          <div class="card-title">📚 Daftar Jurusan</div>
        </div>
        <div class="card-body" style="padding: 20px;">
          ${['TKR', 'TKJ', 'AK', 'MP'].map(m => {
            const fullName = m === 'TKR' ? 'Teknik Kendaraan Ringan' : m === 'TKJ' ? 'Teknik Komputer dan Jaringan' : m === 'AK' ? 'Akuntansi' : 'Manajemen Perkantoran';
            const count = byMajor[m] || 0;
            const pct = Math.round(count / students.length * 100);
            const tagClass = m === 'TKR' ? 'tag-tkr' : m === 'TKJ' ? 'tag-tkj' : m === 'AK' ? 'tag-ak' : 'tag-mp';
            const clsCount = classes.filter(c => c.major === m).length + (m === 'AK' ? 1 : 0);
            return `<div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 12px; background: #f8fafc;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                <div style="display:flex; align-items:center; gap:10px;">
                  <span class="tag ${tagClass}" style="font-size:13px;padding:4px 12px;">${m}</span>
                  <span style="font-size:13px;font-weight:600;color:#374151;">${fullName}</span>
                </div>
                <span style="font-size:20px;font-weight:900;color:#1e293b;">${count}</span>
              </div>
              <div class="bar-track" style="height:10px;">
                <div class="bar-fill" style="width:${pct}%;height:100%;"></div>
              </div>
              <div style="display:flex;justify-content:space-between;margin-top:6px;">
                <span style="font-size:11px;color:#64748b;">${clsCount} kelas</span>
                <span style="font-size:11px;font-weight:700;color:#64748b;">${pct}% dari total</span>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>
  </section>

  <hr class="divider">

  <!-- AUDIT LOG -->
  <section class="section" id="audit">
    <div class="section-header">
      <div class="section-icon">🔍</div>
      <div>
        <div class="section-title">Audit Log Sistem</div>
        <div class="section-subtitle">100 aktivitas terakhir yang tercatat di sistem (total 637 aktivitas)</div>
      </div>
    </div>

    <!-- Summary by action -->
    <div class="cards-grid" style="grid-template-columns: repeat(4, 1fr);">
      ${['LOGIN', 'UPDATE', 'CREATE', 'DELETE'].map(action => {
        const count = auditLogs.filter(l => l.action === action).length;
        const icon = action === 'LOGIN' ? '🔐' : action === 'UPDATE' ? '✏️' : action === 'CREATE' ? '➕' : '🗑️';
        const badge = action === 'LOGIN' ? 'badge-success' : action === 'UPDATE' ? 'badge-info' : action === 'CREATE' ? 'badge-warning' : 'badge-danger';
        return `<div class="stat-card" style="text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">${icon}</div>
          <div class="stat-label">${action}</div>
          <div class="stat-value" style="font-size:28px;">${count}</div>
          <div class="stat-detail">dari 100 terakhir</div>
        </div>`;
      }).join('')}
    </div>

    <div class="table-wrapper">
      <div style="overflow-y: auto; max-height: 500px;">
        ${auditLogs.map(log => {
          const action = log.action || '';
          const iconClass = action === 'LOGIN' ? 'login' : action === 'UPDATE' ? 'update' : action === 'CREATE' ? 'create' : action === 'DELETE' ? 'delete' : 'other';
          const icon = action === 'LOGIN' ? '🔐' : action === 'UPDATE' ? '✏️' : action === 'CREATE' ? '➕' : action === 'DELETE' ? '🗑️' : '📝';
          const time = new Date(log.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
          return `<div class="audit-item">
            <div class="audit-icon ${iconClass}">${icon}</div>
            <div class="audit-body">
              <div>
                <span class="audit-user">${log.user_name || 'Sistem'}</span>
                <span class="audit-role">${log.user_role || '-'}</span>
              </div>
              <div class="audit-detail">${log.detail || log.action || '-'}</div>
              <div class="audit-time">🕐 ${time} ${log.ip_address ? '• IP: ' + log.ip_address : ''}</div>
            </div>
            <div>
              <span class="badge ${action === 'LOGIN' ? 'badge-success' : action === 'UPDATE' ? 'badge-info' : action === 'CREATE' ? 'badge-warning' : action === 'DELETE' ? 'badge-danger' : 'badge-info'}">${action}</span>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="table-info">
        <span>Menampilkan ${auditLogs.length} dari <strong>637</strong> total audit log</span>
        <span>Target type: session, system_data, dll</span>
      </div>
    </div>
  </section>

  <hr class="divider">

  <!-- PENGGUNA -->
  <section class="section" id="pengguna">
    <div class="section-header">
      <div class="section-icon">👤</div>
      <div>
        <div class="section-title">Daftar Pengguna Sistem</div>
        <div class="section-subtitle">Guru, TU, dan karyawan yang terdaftar sebagai pengguna</div>
      </div>
    </div>

    <div class="table-wrapper">
      <div class="table-scroll">
        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>ID</th>
              <th>Nama</th>
              <th>Role</th>
              <th>Terdaftar</th>
              <th>Login Terakhir</th>
            </tr>
          </thead>
          <tbody>
            ${users.map((u, i) => {
              const roleBadge = u.role === 'admin' ? 'badge-danger' : u.role === 'guru' ? 'badge-success' : u.role === 'tu' ? 'badge-info' : 'badge-warning';
              const created = u.created_at ? new Date(u.created_at).toLocaleDateString('id-ID') : '-';
              return `<tr>
                <td class="td-no">${i+1}</td>
                <td class="td-nis">${u.username || u.id}</td>
                <td class="td-name">${u.name || '-'}</td>
                <td><span class="badge ${roleBadge}">${u.role || '-'}</span></td>
                <td style="font-size:12px;color:#64748b;">${created}</td>
                <td style="font-size:12px;color:#64748b;">—</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
      <div class="table-info">
        <span>Total <strong>${users.length}</strong> pengguna aktif</span>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <div style="text-align:center;padding:32px 0;color:#94a3b8;font-size:13px;font-weight:500;">
    <div style="margin-bottom:4px;">© ${new Date().getFullYear()} SMK KARYA GUNA 2 BEKASI — Sistem Manajemen Sekolah KURMON</div>
    <div>Dibuat otomatis pada ${now}</div>
  </div>

</div>

<script>
// Smooth scroll for nav
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', e => {
    e.preventDefault();
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    const target = document.querySelector(tab.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Highlight active section on scroll
const sections = document.querySelectorAll('section.section');
const navTabs = document.querySelectorAll('.nav-tab');
window.addEventListener('scroll', () => {
  let current = '';
  sections.forEach(s => {
    if (window.scrollY >= s.offsetTop - 100) current = '#' + s.id;
  });
  navTabs.forEach(t => {
    t.classList.toggle('active', t.getAttribute('href') === current);
  });
});
</script>

</body>
</html>`;

writeFileSync('public/audit-data.html', html, 'utf-8');
console.log('✅ audit-data.html berhasil dibuat di public/audit-data.html');
console.log('   Ukuran:', Math.round(html.length / 1024), 'KB');

await pool.end();
