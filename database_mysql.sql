-- ==============================================================================
-- DATABASE MYSQL / MARIADB RESMI: ROBOMAN2
-- Kompatibel dengan: XAMPP, phpMyAdmin, MySQL Workbench, MariaDB
-- ==============================================================================

CREATE DATABASE IF NOT EXISTS `roboman2` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `roboman2`;

SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------------------------
-- 1. TABEL USER_ACCOUNTS (Autentikasi Pengurus & Admin)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `user_accounts`;
CREATE TABLE `user_accounts` (
  `username` VARCHAR(50) NOT NULL,
  `password` TEXT NOT NULL,
  `name` VARCHAR(100) NOT NULL DEFAULT '',
  `role` VARCHAR(50) NOT NULL DEFAULT 'Pengurus Inti',
  `email` VARCHAR(100) DEFAULT '',
  `nisn` VARCHAR(30) DEFAULT '',
  `recovery_pin` VARCHAR(255) DEFAULT '',
  `auth_provider` VARCHAR(50) DEFAULT 'credentials',
  `avatar_url` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. TABEL MEMBERS (Master Data Anggota & Pengurus)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `id_member` VARCHAR(50) NOT NULL,
  `nisn` VARCHAR(30) DEFAULT '',
  `account_username` VARCHAR(50) DEFAULT 'admin',
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `email` VARCHAR(100) DEFAULT '',
  `full_name` VARCHAR(150) NOT NULL,
  `grade` VARCHAR(10) DEFAULT 'X',
  `class_room` VARCHAR(10) DEFAULT '',
  `gender` VARCHAR(20) DEFAULT 'Male',
  `nik` VARCHAR(30) DEFAULT '',
  `address` TEXT,
  `personal_phone` VARCHAR(30) DEFAULT '',
  `parent_phone` VARCHAR(30) DEFAULT '',
  `status` VARCHAR(40) DEFAULT 'Aktif',
  `role` VARCHAR(50) DEFAULT 'member',
  `jabatan` VARCHAR(50) DEFAULT 'member',
  `birth_date` VARCHAR(30) DEFAULT '',
  `birth_place` VARCHAR(100) DEFAULT '',
  `is_verified` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_member`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. TABEL ATTENDANCE (Presensi & Absensi Kegiatan)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `attendance`;
CREATE TABLE `attendance` (
  `id` VARCHAR(100) NOT NULL,
  `tanggal` DATE NOT NULL,
  `id_member` VARCHAR(50) NOT NULL,
  `account_username` VARCHAR(50) DEFAULT 'admin',
  `nama_anggota` VARCHAR(150) DEFAULT '',
  `status` ENUM('Hadir', 'Izin', 'Sakit', 'Alpha') NOT NULL DEFAULT 'Hadir',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_attendance_date_member` (`tanggal`, `id_member`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. TABEL CASH_TRANSACTIONS (Buku Kas & Keuangan)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `cash_transactions`;
CREATE TABLE `cash_transactions` (
  `id` VARCHAR(100) NOT NULL,
  `tanggal` DATE NOT NULL,
  `id_member` VARCHAR(50) DEFAULT NULL,
  `account_username` VARCHAR(50) DEFAULT 'admin',
  `nama_anggota` VARCHAR(150) DEFAULT '',
  `jenis` ENUM('Masuk', 'Keluar') NOT NULL DEFAULT 'Masuk',
  `jumlah` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `keterangan` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. TABEL ANNOUNCEMENTS (Pengumuman & Agenda Ekskul)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `announcements`;
CREATE TABLE `announcements` (
  `id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` TEXT NOT NULL,
  `event_date` TIMESTAMP NULL DEFAULT NULL,
  `location` VARCHAR(150) DEFAULT 'Workshop Robotika roboman2',
  `author_name` VARCHAR(150) DEFAULT 'Pengurus Ekskul',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 6. TABEL MATERIALS_ASSIGNMENTS (Materi & Tugas)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `materials_assignments`;
CREATE TABLE `materials_assignments` (
  `id` VARCHAR(100) NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT,
  `type` ENUM('material', 'assignment') NOT NULL DEFAULT 'material',
  `attachment_url` TEXT,
  `deadline` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 7. TABEL ASSIGNMENT_SUBMISSIONS (Pengumpulan Tugas Siswa)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `assignment_submissions`;
CREATE TABLE `assignment_submissions` (
  `id` VARCHAR(100) NOT NULL,
  `assignment_id` VARCHAR(100) NOT NULL,
  `student_id` VARCHAR(50) NOT NULL,
  `student_name` VARCHAR(150) DEFAULT '',
  `submission_url` TEXT,
  `submission_text` TEXT,
  `score` INT DEFAULT NULL,
  `feedback` TEXT,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_assignment_student` (`assignment_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- DATA AWAL / SAMPLE SEED DATA
-- ==============================================================================

-- Akun Administrator Utama
INSERT INTO `user_accounts` (`username`, `password`, `name`, `role`, `email`, `nisn`) VALUES
('admin', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.qytHHvUQe.1GgXkQ8k.5eJzN60Hq3qC', 'Administrator roboman2', 'Pengurus Inti', 'roboticman2kotabekasi@gmail.com', '197505121998031001')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

-- Data Anggota Awal
INSERT INTO `members` (`id_member`, `nisn`, `account_username`, `email`, `full_name`, `grade`, `class_room`, `gender`, `personal_phone`, `status`, `role`, `jabatan`) VALUES
('101', '197505121998031001', 'admin', 'pembina@man2kotabekasi.sch.id', 'Drs. H. Ahmad Fauzi, M.Pd', 'Faculty', 'Advisor', 'Male', '0812-0000-0101', 'Aktif', 'pembina', 'advisor'),
('102', '0110000099', 'admin', 'ketua@man2kotabekasi.sch.id', 'Muhammad Rayhan Pratama', 'XII', 'A', 'Male', '0812-0000-0102', 'Aktif', 'admin', 'president'),
('103', '0110000098', 'admin', 'wakil@man2kotabekasi.sch.id', 'Fikri Haikal', 'XII', 'B', 'Male', '0812-0000-0103', 'Aktif', 'admin', 'vice_president'),
('104', '0110000097', 'admin', 'sekretaris@man2kotabekasi.sch.id', 'Aisyah Nurul Azmi', 'XI', 'A', 'Female', '0812-0000-0104', 'Aktif', 'member', 'secretary'),
('105', '0110000096', 'admin', 'bendahara@man2kotabekasi.sch.id', 'Nabila Putri Cahyani', 'XI', 'B', 'Female', '0812-0000-0105', 'Aktif', 'member', 'treasurer'),
('106', '0120000001', 'admin', 'anggota1@man2kotabekasi.sch.id', 'Bintang Ramadhan', 'X', 'A', 'Male', '0812-0000-0106', 'Aktif', 'member', 'member'),
('107', '0120000002', 'admin', 'anggota2@man2kotabekasi.sch.id', 'Citra Lestari', 'X', 'B', 'Female', '0812-0000-0107', 'Aktif', 'member', 'member')
ON DUPLICATE KEY UPDATE `full_name`=VALUES(`full_name`);

-- Data Pengumuman Awal
INSERT INTO `announcements` (`id`, `title`, `content`, `event_date`, `location`, `author_name`) VALUES
('ann-001', 'Jadwal Latihan Rutin & Pemrograman Robot', 'Seluruh anggota divisi pemrograman dan mekanik dimohon hadir tepat waktu untuk persiapan lomba.', NOW() + INTERVAL 2 DAY, 'Workshop Robotika roboman2', 'Pengurus Ekskul')
ON DUPLICATE KEY UPDATE `title`=VALUES(`title`);

-- Data Kas Masuk Awal
INSERT INTO `cash_transactions` (`id`, `tanggal`, `id_member`, `nama_anggota`, `jenis`, `jumlah`, `keterangan`) VALUES
('cash-001', CURDATE(), '102', 'Muhammad Rayhan Pratama', 'Masuk', 50000.00, 'Iuran Kas Anggota - Periode Baru'),
('cash-002', CURDATE(), '103', 'Fikri Haikal', 'Masuk', 50000.00, 'Iuran Kas Anggota - Periode Baru')
ON DUPLICATE KEY UPDATE `jumlah`=VALUES(`jumlah`);
