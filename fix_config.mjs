import pg from 'pg';

const pool = new pg.Pool({ connectionString: 'postgres://postgres:ijjuuiue@localhost:5432/school_system_db' });

async function run() {
  const confRes = await pool.query("SELECT data FROM app_data WHERE store_key = 'hikvision_attendance_config'");
  if (confRes.rows.length > 0) {
    let conf = typeof confRes.rows[0].data === 'string' ? JSON.parse(confRes.rows[0].data) : confRes.rows[0].data;
    if (conf.siswa) {
      conf.siswa.masuk_close = "08:00";
      conf.siswa.masuk_end = "08:00";
    }
    if (conf.guru) {
      conf.guru.masuk_close = "08:00";
      conf.guru.masuk_end = "08:00";
    }
    if (conf.karyawan) {
      conf.karyawan.masuk_close = "08:00";
      conf.karyawan.masuk_end = "08:00";
    }
    conf.masuk_close = "08:00";
    conf.masuk_end = "08:00";

    await pool.query("UPDATE app_data SET data = $1 WHERE store_key = 'hikvision_attendance_config'", [JSON.stringify(conf)]);
    console.log("Config updated successfully:", JSON.stringify(conf, null, 2));
  }
  await pool.end();
}

run().catch(console.error);
