<?php
/**
 * ==============================================================================
 * roboman2 - Official MySQL Backend API Engine for cPanel / Domainesia
 * ==============================================================================
 * Host: localhost
 * Database: mankota1_robotik
 * User: mankota1_robotik
 * Pass: 3Bh4-IR$4eh%aHyW
 * ==============================================================================
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Konfigurasi Database MySQL Domainesia
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'robotakman2kotbek';
$db_user = getenv('DB_USER') ?: 'robotakman2kotbek';
$db_pass = getenv('DB_PASSWORD') ?: 'robodih';

// Kandidat koneksi (prioritas: robotakman2kotbek, prefix cPanel mankota1_, atau mankota1_robotik)
$candidates = [
    ['name' => $db_name, 'user' => $db_user, 'pass' => $db_pass],
    ['name' => 'mankota1_' . $db_name, 'user' => 'mankota1_' . $db_user, 'pass' => $db_pass],
    ['name' => 'mankota1_robotik', 'user' => 'mankota1_robotik', 'pass' => '3Bh4-IR$4eh%aHyW'],
];

$pdo = null;
$lastError = '';

foreach ($candidates as $c) {
    try {
        $pdo = new PDO("mysql:host=$db_host;dbname={$c['name']};charset=utf8mb4", $c['user'], $c['pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $db_name = $c['name'];
        $db_user = $c['user'];
        break;
    } catch (PDOException $e) {
        $lastError = $e->getMessage();
    }
}

if (!$pdo) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Koneksi MySQL Gagal: ' . $lastError,
        'tip' => 'Pastikan user ' . $db_user . ' dan database ' . $db_name . ' sudah dibuat di cPanel MySQL Databases dan diberi ALL PRIVILEGES.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// 2. Fungsi Otomatis Buat Tabel Jika Belum Ada (Self-Healing Schema)
function ensureTablesExist($pdo) {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS `user_accounts` (
            `username` VARCHAR(50) NOT NULL PRIMARY KEY,
            `password` TEXT NOT NULL,
            `name` VARCHAR(100) NOT NULL DEFAULT '',
            `role` VARCHAR(50) NOT NULL DEFAULT 'Pengurus Inti',
            `email` VARCHAR(100) DEFAULT '',
            `nisn` VARCHAR(30) DEFAULT '',
            `recovery_pin` VARCHAR(255) DEFAULT '',
            `auth_provider` VARCHAR(50) DEFAULT 'credentials',
            `avatar_url` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `members` (
            `id_member` VARCHAR(50) NOT NULL PRIMARY KEY,
            `nisn` VARCHAR(30) DEFAULT '',
            `account_username` VARCHAR(50) DEFAULT 'admin',
            `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `email` VARCHAR(100) DEFAULT '',
            `full_name` VARCHAR(150) NOT NULL,
            `grade` VARCHAR(10) DEFAULT 'X',
            `class_room` VARCHAR(10) DEFAULT 'A',
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
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `attendance` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
            `tanggal` DATE NOT NULL,
            `id_member` VARCHAR(50) NOT NULL,
            `account_username` VARCHAR(50) DEFAULT 'admin',
            `nama_anggota` VARCHAR(150) DEFAULT '',
            `status` VARCHAR(20) NOT NULL DEFAULT 'Hadir',
            `notes` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY `uq_attendance_date_member` (`tanggal`, `id_member`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `cash_transactions` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
            `tanggal` DATE NOT NULL,
            `id_member` VARCHAR(50) DEFAULT NULL,
            `account_username` VARCHAR(50) DEFAULT 'admin',
            `nama_anggota` VARCHAR(150) DEFAULT '',
            `jenis` VARCHAR(20) NOT NULL DEFAULT 'Masuk',
            `jumlah` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
            `keterangan` TEXT,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `announcements` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
            `title` VARCHAR(200) NOT NULL,
            `content` TEXT NOT NULL,
            `event_date` TIMESTAMP NULL DEFAULT NULL,
            `location` VARCHAR(150) DEFAULT 'Workshop Robotika roboman2',
            `author_name` VARCHAR(150) DEFAULT 'Pengurus Ekskul',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");
}

ensureTablesExist($pdo);

$action = isset($_GET['action']) ? trim($_GET['action']) : '';
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?: [];

try {
    switch ($action) {
        case 'health':
        case 'ping':
            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            $countM = $pdo->query("SELECT COUNT(*) FROM members")->fetchColumn();
            $countA = $pdo->query("SELECT COUNT(*) FROM attendance")->fetchColumn();
            $countC = $pdo->query("SELECT COUNT(*) FROM cash_transactions")->fetchColumn();
            echo json_encode([
                'success' => true,
                'status' => 'MySQL Live Connected',
                'database' => $db_name,
                'tables' => $tables,
                'counts' => [
                    'members' => (int)$countM,
                    'attendance' => (int)$countA,
                    'cash' => (int)$countC,
                ],
                'timestamp' => date('c')
            ]);
            break;

        case 'sync_all':
            // Batch push from React App to MySQL
            $members = $input['members'] ?? [];
            $attendance = $input['attendance'] ?? [];
            $cash = $input['cash'] ?? [];

            $pdo->beginTransaction();

            // 1. Upsert members
            if (!empty($members) && is_array($members)) {
                $stmtM = $pdo->prepare("INSERT INTO members 
                    (id_member, nisn, account_username, email, full_name, grade, class_room, gender, nik, address, personal_phone, parent_phone, status, role, jabatan, birth_date, birth_place, is_verified)
                    VALUES (:id, :nisn, :acc, :email, :name, :grade, :room, :gender, :nik, :address, :phone, :parent_phone, :status, :role, :jabatan, :birth_date, :birth_place, :verified)
                    ON DUPLICATE KEY UPDATE 
                        nisn = VALUES(nisn), full_name = VALUES(full_name), grade = VALUES(grade), class_room = VALUES(class_room),
                        gender = VALUES(gender), address = VALUES(address), personal_phone = VALUES(personal_phone), parent_phone = VALUES(parent_phone),
                        status = VALUES(status), role = VALUES(role), jabatan = VALUES(jabatan), is_verified = VALUES(is_verified)");

                foreach ($members as $m) {
                    $id = !empty($m['id_member']) ? (string)$m['id_member'] : (!empty($m['nisn']) ? (string)$m['nisn'] : uniqid('m_'));
                    $stmtM->execute([
                        ':id' => $id,
                        ':nisn' => $m['nisn'] ?? '',
                        ':acc' => $m['account_username'] ?? 'admin',
                        ':email' => $m['email'] ?? '',
                        ':name' => $m['fullName'] ?? ($m['full_name'] ?? 'Member'),
                        ':grade' => $m['grade'] ?? 'X',
                        ':room' => $m['classRoom'] ?? ($m['class_room'] ?? 'A'),
                        ':gender' => $m['gender'] ?? 'Male',
                        ':nik' => $m['nik'] ?? '',
                        ':address' => $m['address'] ?? '',
                        ':phone' => $m['personalPhone'] ?? ($m['personal_phone'] ?? ''),
                        ':parent_phone' => $m['parentPhone'] ?? ($m['parent_phone'] ?? ''),
                        ':status' => $m['status'] ?? 'Aktif',
                        ':role' => $m['role'] ?? 'member',
                        ':jabatan' => $m['jabatan'] ?? 'member',
                        ':birth_date' => $m['birthDate'] ?? ($m['birth_date'] ?? ''),
                        ':birth_place' => $m['birthPlace'] ?? ($m['birth_place'] ?? ''),
                        ':verified' => !empty($m['isVerified']) || !empty($m['is_verified']) ? 1 : 0,
                    ]);
                }
            }

            // 2. Upsert attendance
            if (!empty($attendance) && is_array($attendance)) {
                $stmtA = $pdo->prepare("INSERT INTO attendance 
                    (id, tanggal, id_member, account_username, nama_anggota, status, notes)
                    VALUES (:id, :tanggal, :id_member, :acc, :nama, :status, :notes)
                    ON DUPLICATE KEY UPDATE 
                        status = VALUES(status), nama_anggota = VALUES(nama_anggota), notes = VALUES(notes)");

                foreach ($attendance as $a) {
                    $id = !empty($a['id']) ? (string)$a['id'] : uniqid('att_');
                    $tgl = !empty($a['tanggal']) ? date('Y-m-d', strtotime($a['tanggal'])) : date('Y-m-d');
                    $memId = !empty($a['id_member']) ? (string)$a['id_member'] : (!empty($a['nisn']) ? (string)$a['nisn'] : 'unknown');
                    $stmtA->execute([
                        ':id' => $id,
                        ':tanggal' => $tgl,
                        ':id_member' => $memId,
                        ':acc' => $a['account_username'] ?? 'admin',
                        ':nama' => $a['namaAnggota'] ?? ($a['nama_anggota'] ?? ''),
                        ':status' => $a['status'] ?? 'Hadir',
                        ':notes' => $a['notes'] ?? '',
                    ]);
                }
            }

            // 3. Upsert cash transactions
            if (!empty($cash) && is_array($cash)) {
                $stmtC = $pdo->prepare("INSERT INTO cash_transactions 
                    (id, tanggal, id_member, account_username, nama_anggota, jenis, jumlah, keterangan)
                    VALUES (:id, :tanggal, :id_member, :acc, :nama, :jenis, :jumlah, :ket)
                    ON DUPLICATE KEY UPDATE 
                        jumlah = VALUES(jumlah), jenis = VALUES(jenis), keterangan = VALUES(keterangan), nama_anggota = VALUES(nama_anggota)");

                foreach ($cash as $c) {
                    $id = !empty($c['id']) ? (string)$c['id'] : uniqid('cash_');
                    $tgl = !empty($c['tanggal']) ? date('Y-m-d', strtotime($c['tanggal'])) : date('Y-m-d');
                    $memId = !empty($c['id_member']) ? (string)$c['id_member'] : null;
                    $stmtC->execute([
                        ':id' => $id,
                        ':tanggal' => $tgl,
                        ':id_member' => $memId,
                        ':acc' => $c['account_username'] ?? 'admin',
                        ':nama' => $c['namaAnggota'] ?? ($c['nama_anggota'] ?? ''),
                        ':jenis' => $c['jenis'] ?? 'Masuk',
                        ':jumlah' => (float)($c['jumlah'] ?? 0),
                        ':ket' => $c['keterangan'] ?? '',
                    ]);
                }
            }

            $pdo->commit();

            echo json_encode([
                'success' => true,
                'message' => 'Semua data berhasil disinkronkan ke MySQL Domainesia!',
                'counts' => [
                    'members' => count($members),
                    'attendance' => count($attendance),
                    'cash' => count($cash),
                ]
            ]);
            break;

        case 'fetch_all':
            $members = $pdo->query("SELECT * FROM members ORDER BY full_name ASC")->fetchAll();
            $attendance = $pdo->query("SELECT * FROM attendance ORDER BY tanggal DESC")->fetchAll();
            $cash = $pdo->query("SELECT * FROM cash_transactions ORDER BY tanggal DESC")->fetchAll();
            $announcements = $pdo->query("SELECT * FROM announcements ORDER BY created_at DESC")->fetchAll();

            // Format to match React types
            $formattedMembers = array_map(function($m) {
                return [
                    'id_member' => $m['id_member'],
                    'nisn' => $m['nisn'] ?? '',
                    'email' => $m['email'] ?? '',
                    'fullName' => $m['full_name'],
                    'grade' => $m['grade'] ?? 'X',
                    'classRoom' => $m['class_room'] ?? 'A',
                    'gender' => $m['gender'] ?? 'Male',
                    'nik' => $m['nik'] ?? '',
                    'address' => $m['address'] ?? '',
                    'personalPhone' => $m['personal_phone'] ?? '',
                    'parentPhone' => $m['parent_phone'] ?? '',
                    'status' => $m['status'] ?? 'Aktif',
                    'role' => $m['role'] ?? 'member',
                    'jabatan' => $m['jabatan'] ?? 'member',
                    'birthDate' => $m['birth_date'] ?? '',
                    'birthPlace' => $m['birth_place'] ?? '',
                    'isVerified' => (bool)$m['is_verified'],
                    'timestamp' => $m['timestamp'] ?? date('c'),
                ];
            }, $members);

            $formattedAttendance = array_map(function($a) {
                return [
                    'id' => $a['id'],
                    'tanggal' => $a['tanggal'],
                    'id_member' => $a['id_member'],
                    'namaAnggota' => $a['nama_anggota'],
                    'status' => $a['status'],
                    'notes' => $a['notes'] ?? '',
                ];
            }, $attendance);

            $formattedCash = array_map(function($c) {
                return [
                    'id' => $c['id'],
                    'tanggal' => $c['tanggal'],
                    'id_member' => $c['id_member'] ?? null,
                    'namaAnggota' => $c['nama_anggota'] ?? '',
                    'jenis' => $c['jenis'],
                    'jumlah' => (float)$c['jumlah'],
                    'keterangan' => $c['keterangan'] ?? '',
                ];
            }, $cash);

            echo json_encode([
                'success' => true,
                'data' => [
                    'members' => $formattedMembers,
                    'attendance' => $formattedAttendance,
                    'cash' => $formattedCash,
                    'announcements' => $announcements,
                ]
            ]);
            break;

        case 'upsert_member':
            $m = $input;
            $id = !empty($m['id_member']) ? (string)$m['id_member'] : (!empty($m['nisn']) ? (string)$m['nisn'] : uniqid('m_'));
            $stmt = $pdo->prepare("INSERT INTO members 
                (id_member, nisn, account_username, email, full_name, grade, class_room, gender, nik, address, personal_phone, parent_phone, status, role, jabatan, birth_date, birth_place, is_verified)
                VALUES (:id, :nisn, :acc, :email, :name, :grade, :room, :gender, :nik, :address, :phone, :parent_phone, :status, :role, :jabatan, :birth_date, :birth_place, :verified)
                ON DUPLICATE KEY UPDATE 
                    nisn = VALUES(nisn), full_name = VALUES(full_name), grade = VALUES(grade), class_room = VALUES(class_room),
                    gender = VALUES(gender), address = VALUES(address), personal_phone = VALUES(personal_phone), parent_phone = VALUES(parent_phone),
                    status = VALUES(status), role = VALUES(role), jabatan = VALUES(jabatan), is_verified = VALUES(is_verified)");

            $stmt->execute([
                ':id' => $id,
                ':nisn' => $m['nisn'] ?? '',
                ':acc' => $m['account_username'] ?? 'admin',
                ':email' => $m['email'] ?? '',
                ':name' => $m['fullName'] ?? ($m['full_name'] ?? 'Member'),
                ':grade' => $m['grade'] ?? 'X',
                ':room' => $m['classRoom'] ?? ($m['class_room'] ?? 'A'),
                ':gender' => $m['gender'] ?? 'Male',
                ':nik' => $m['nik'] ?? '',
                ':address' => $m['address'] ?? '',
                ':phone' => $m['personalPhone'] ?? ($m['personal_phone'] ?? ''),
                ':parent_phone' => $m['parentPhone'] ?? ($m['parent_phone'] ?? ''),
                ':status' => $m['status'] ?? 'Aktif',
                ':role' => $m['role'] ?? 'member',
                ':jabatan' => $m['jabatan'] ?? 'member',
                ':birth_date' => $m['birthDate'] ?? ($m['birth_date'] ?? ''),
                ':birth_place' => $m['birthPlace'] ?? ($m['birth_place'] ?? ''),
                ':verified' => !empty($m['isVerified']) || !empty($m['is_verified']) ? 1 : 0,
            ]);

            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'delete_member':
            $id = $input['id_member'] ?? ($input['nisn'] ?? ($_GET['id'] ?? ''));
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM members WHERE id_member = :id OR nisn = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing member id']);
            }
            break;

        case 'upsert_attendance':
            $a = $input;
            $id = !empty($a['id']) ? (string)$a['id'] : uniqid('att_');
            $tgl = !empty($a['tanggal']) ? date('Y-m-d', strtotime($a['tanggal'])) : date('Y-m-d');
            $memId = !empty($a['id_member']) ? (string)$a['id_member'] : (!empty($a['nisn']) ? (string)$a['nisn'] : 'unknown');
            $stmt = $pdo->prepare("INSERT INTO attendance 
                (id, tanggal, id_member, account_username, nama_anggota, status, notes)
                VALUES (:id, :tanggal, :id_member, :acc, :nama, :status, :notes)
                ON DUPLICATE KEY UPDATE 
                    status = VALUES(status), nama_anggota = VALUES(nama_anggota), notes = VALUES(notes)");
            $stmt->execute([
                ':id' => $id,
                ':tanggal' => $tgl,
                ':id_member' => $memId,
                ':acc' => $a['account_username'] ?? 'admin',
                ':nama' => $a['namaAnggota'] ?? ($a['nama_anggota'] ?? ''),
                ':status' => $a['status'] ?? 'Hadir',
                ':notes' => $a['notes'] ?? '',
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'upsert_cash':
            $c = $input;
            $id = !empty($c['id']) ? (string)$c['id'] : uniqid('cash_');
            $tgl = !empty($c['tanggal']) ? date('Y-m-d', strtotime($c['tanggal'])) : date('Y-m-d');
            $memId = !empty($c['id_member']) ? (string)$c['id_member'] : null;
            $stmt = $pdo->prepare("INSERT INTO cash_transactions 
                (id, tanggal, id_member, account_username, nama_anggota, jenis, jumlah, keterangan)
                VALUES (:id, :tanggal, :id_member, :acc, :nama, :jenis, :jumlah, :ket)
                ON DUPLICATE KEY UPDATE 
                    jumlah = VALUES(jumlah), jenis = VALUES(jenis), keterangan = VALUES(keterangan), nama_anggota = VALUES(nama_anggota)");
            $stmt->execute([
                ':id' => $id,
                ':tanggal' => $tgl,
                ':id_member' => $memId,
                ':acc' => $c['account_username'] ?? 'admin',
                ':nama' => $c['namaAnggota'] ?? ($c['nama_anggota'] ?? ''),
                ':jenis' => $c['jenis'] ?? 'Masuk',
                ':jumlah' => (float)($c['jumlah'] ?? 0),
                ':ket' => $c['keterangan'] ?? '',
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        default:
            echo json_encode([
                'success' => true,
                'message' => 'roboman2 MySQL Backend API Engine is Live and Ready on Domainesia!',
                'database' => $db_name,
                'endpoints' => [
                    'health' => '/api.php?action=health',
                    'fetch_all' => '/api.php?action=fetch_all',
                    'sync_all' => '/api.php?action=sync_all',
                    'upsert_member' => '/api.php?action=upsert_member',
                    'delete_member' => '/api.php?action=delete_member',
                    'upsert_attendance' => '/api.php?action=upsert_attendance',
                    'upsert_cash' => '/api.php?action=upsert_cash',
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
