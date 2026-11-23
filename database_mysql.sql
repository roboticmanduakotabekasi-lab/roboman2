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
  `description` TEXT NOT NULL,
  `type` VARCHAR(20) NOT NULL DEFAULT 'material',
  `deadline` DATETIME NULL DEFAULT NULL,
  `attachment_url` TEXT,
  `grading_type` VARCHAR(20) DEFAULT 'numeric',
  `max_score` DECIMAL(5,2) DEFAULT 100.00,
  `created_by` VARCHAR(100) DEFAULT '',
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
  `student_id` VARCHAR(100) NOT NULL,
  `student_email` VARCHAR(150) NOT NULL,
  `student_name` VARCHAR(150) NOT NULL,
  `submission_text` TEXT,
  `submission_link` TEXT,
  `status` VARCHAR(30) DEFAULT 'submitted',
  `score_numeric` DECIMAL(5,2) NULL,
  `score_binary` VARCHAR(30) NULL,
  `feedback` TEXT,
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `graded_at` TIMESTAMP NULL DEFAULT NULL,
  `graded_by` VARCHAR(100) DEFAULT '',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_assignment_student` (`assignment_id`, `student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 8. TABEL ALLOWED_MEMBERS (Daftar Siswa Terdaftar / Roster)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `allowed_members`;
CREATE TABLE `allowed_members` (
  `id` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `nama_lengkap` VARCHAR(150) NOT NULL,
  `nis_atau_kelas` VARCHAR(50) DEFAULT '',
  `jabatan_ekskul` VARCHAR(50) DEFAULT 'member',
  `status_akun` VARCHAR(30) DEFAULT 'unclaimed',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `claimed_at` TIMESTAMP NULL DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 9. TABEL LOGIN_ATTEMPTS (Anti-Brute Force Protection)
-- ------------------------------------------------------------------------------
DROP TABLE IF EXISTS `login_attempts`;
CREATE TABLE `login_attempts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `ip_address` VARCHAR(45) NOT NULL,
  `identifier` VARCHAR(100) NOT NULL,
  `attempt_type` VARCHAR(20) NOT NULL DEFAULT 'login',
  `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_ip_time` (`ip_address`, `attempt_time`),
  KEY `idx_ident_time` (`identifier`, `attempt_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;

-- ==============================================================================
-- INSIALISASI AKUN ADMINISTRATOR UTAMA (SIAP LOGIN)
-- ==============================================================================
INSERT INTO `user_accounts` (`username`, `password`, `name`, `role`, `email`, `nisn`) VALUES
('admin', '3bb62e9d75c65289a724a94ec88ff9a0d1ff647652c00300d1c6dd1466bf15c0', 'Admin Robotic MAN 2 Kota Bekasi', 'admin', 'roboticman2kotabekasi@gmail.com', '197505121998031001')
ON DUPLICATE KEY UPDATE `name`=VALUES(`name`);

