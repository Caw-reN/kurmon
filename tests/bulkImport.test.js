import test from "node:test";
import assert from "node:assert/strict";
import * as XLSX from "xlsx";

import {
  parseBulkTextRows,
  splitBulkColumns,
  workbookSheetToDelimitedText,
} from "../src/utils/bulkImport.js";

test("splitBulkColumns handles quoted commas and tabs", () => {
  assert.deepEqual(
    splitBulkColumns('"Dra. A, S.Pd"\t"TKR"\t"Semua"'),
    ["Dra. A, S.Pd", "TKR", "Semua"]
  );
});

test("splitBulkColumns handles pipe separated rows", () => {
  assert.deepEqual(
    splitBulkColumns("Pertemuan 1: Pengenalan Algoritma | Siswa memahami konsep dasar | Definisi algoritma"),
    ["Pertemuan 1: Pengenalan Algoritma", "Siswa memahami konsep dasar", "Definisi algoritma"]
  );
});

test("parseBulkTextRows removes template headers", () => {
  const rows = parseBulkTextRows("Kode Guru\tNama Guru\tPassword\tKategori\tPrioritas Jurusan\n14\tDra. ROSYIDAH\t123\tUmum\tSemua", "guru");
  assert.deepEqual(rows, [["14", "Dra. ROSYIDAH", "123", "Umum", "Semua"]]);
});

test("workbookSheetToDelimitedText reads the correct sheet and skips headers", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Nama Kelas (wajib)", "Jurusan (pilih dari Data Jurusan)"],
    ["X TKR 1", "TKR"],
    ["XI TKJ 1", "TKJ"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "2_Kelas");

  const text = workbookSheetToDelimitedText(wb, "kelas", XLSX.utils.sheet_to_json);
  assert.equal(text.trim(), "X TKR 1\tTKR\nXI TKJ 1\tTKJ");
});

test("workbookSheetToDelimitedText rejects invalid headers", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Bukan header yang benar"],
    ["X TKR 1"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "2_Kelas");

  assert.throws(() => workbookSheetToDelimitedText(wb, "kelas", XLSX.utils.sheet_to_json), /tidak sesuai template impor/i);
});

test("workbookSheetToDelimitedText accepts updated syllabus headers", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Mata Pelajaran (wajib)",
      "Guru Pengajar (wajib)",
      "Judul Pertemuan / BAB (wajib)",
      "Kelas / Semester",
      "Tujuan Pembelajaran",
      "Materi Pembelajaran (pisah enter)",
      "Catatan (opsional)",
    ],
    ["Pemrograman Dasar", "G02", "Pertemuan 1: Pengenalan Algoritma", "X / Ganjil", "Siswa paham algoritma", "Definisi algoritma", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Silabus");

  const text = workbookSheetToDelimitedText(wb, "silabusguru", XLSX.utils.sheet_to_json);
  assert.match(text, /Pemrograman Dasar\tG02\tPertemuan 1: Pengenalan Algoritma\tX \/ Ganjil\tSiswa paham algoritma\tDefinisi algoritma\t/);
});

test("workbookSheetToDelimitedText accepts teacher syllabus sheet for admin syllabus import", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    [
      "Mata Pelajaran (wajib)",
      "Guru Pengajar (wajib)",
      "Judul Pertemuan / BAB (wajib)",
      "Kelas / Semester",
      "Tujuan Pembelajaran",
      "Materi Pembelajaran (pisah enter)",
      "Catatan (opsional)",
    ],
    ["Pemrograman Dasar", "G02", "Pertemuan 2: Flowchart", "X / Ganjil", "Siswa paham flowchart", "Simbol flowchart", ""],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "Silabus");

  const text = workbookSheetToDelimitedText(wb, "silabus", XLSX.utils.sheet_to_json);
  assert.match(text, /Pemrograman Dasar\tG02\tPertemuan 2: Flowchart/);
});

test("workbookSheetToDelimitedText accepts academic calendar headers", () => {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["Judul Kegiatan", "Mulai", "Selesai", "Kategori", "Keterangan"],
    ["Ujian Tengah Semester", "2026-09-15", "2026-09-19", "Kurikulum", "Pelaksanaan UTS"],
  ]);
  XLSX.utils.book_append_sheet(wb, ws, "10_Kalender_Akademik");

  const text = workbookSheetToDelimitedText(wb, "akademik", XLSX.utils.sheet_to_json);
  assert.equal(text.trim(), "Ujian Tengah Semester\t2026-09-15\t2026-09-19\tKurikulum\tPelaksanaan UTS");
});
