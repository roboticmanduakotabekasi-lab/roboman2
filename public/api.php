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
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: SAMEORIGIN');
header('X-XSS-Protection: 1; mode=block');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. Konfigurasi Database MySQL Domainesia
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'mankota1_robotik';
$db_user = getenv('DB_USER') ?: 'mankota1_robotik';
$db_pass = getenv('DB_PASSWORD') ?: '3Bh4-IR$4eh%aHyW';

// Kandidat koneksi database MySQL cPanel (Mendukung semua varian nama & kredensial)
$candidates = [
    ['name' => $db_name, 'user' => $db_user, 'pass' => $db_pass],
    ['name' => 'mankota1_robotik', 'user' => 'mankota1_robotik', 'pass' => '3Bh4-IR$4eh%aHyW'],
    ['name' => 'robotakman2kotbek', 'user' => 'robotakman2kotbek', 'pass' => '3Bh4-IR$4eh%aHyW'],
    ['name' => 'robotik', 'user' => 'robotik', 'pass' => '3Bh4-IR$4eh%aHyW'],
    ['name' => 'mankota1_robotakman2kotbek', 'user' => 'mankota1_robotakman2kotbek', 'pass' => '3Bh4-IR$4eh%aHyW'],
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
        'tip' => 'Pastikan database dan user cPanel MySQL sudah dibuat dan diberi ALL PRIVILEGES.'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

// Helper migrasi kolom otomatis (Self-Healing Schema)
function addColumnIfNotExists($pdo, $table, $column, $definition) {
    try {
        $check = $pdo->query("SHOW COLUMNS FROM `$table` LIKE '$column'")->fetch();
        if (!$check) {
            $pdo->exec("ALTER TABLE `$table` ADD COLUMN `$column` $definition");
        }
    } catch (Exception $e) {}
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
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            KEY `idx_user_nisn` (`nisn`)
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
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_member_nisn` (`nisn`)
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

        CREATE TABLE IF NOT EXISTS `materials_assignments` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
            `title` VARCHAR(200) NOT NULL,
            `description` TEXT NOT NULL,
            `type` VARCHAR(20) NOT NULL DEFAULT 'material',
            `deadline` DATETIME NULL DEFAULT NULL,
            `attachment_url` TEXT,
            `grading_type` VARCHAR(20) DEFAULT 'numeric',
            `max_score` DECIMAL(5,2) DEFAULT 100.00,
            `created_by` VARCHAR(100) DEFAULT '',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `assignment_submissions` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
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
            UNIQUE KEY `uq_assignment_student` (`assignment_id`, `student_id`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `allowed_members` (
            `id` VARCHAR(100) NOT NULL PRIMARY KEY,
            `email` VARCHAR(150) NOT NULL UNIQUE,
            `nama_lengkap` VARCHAR(150) NOT NULL,
            `nis_atau_kelas` VARCHAR(50) DEFAULT '',
            `jabatan_ekskul` VARCHAR(50) DEFAULT 'member',
            `status_akun` VARCHAR(30) DEFAULT 'unclaimed',
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `claimed_at` TIMESTAMP NULL DEFAULT NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

        CREATE TABLE IF NOT EXISTS `login_attempts` (
            `id` INT AUTO_INCREMENT PRIMARY KEY,
            `ip_address` VARCHAR(45) NOT NULL,
            `identifier` VARCHAR(100) NOT NULL,
            `attempt_type` VARCHAR(20) NOT NULL DEFAULT 'login',
            `attempt_time` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            KEY `idx_ip_time` (`ip_address`, `attempt_time`),
            KEY `idx_ident_time` (`identifier`, `attempt_time`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Self-healing columns check
    addColumnIfNotExists($pdo, 'user_accounts', 'recovery_pin', 'VARCHAR(255) DEFAULT ""');
    addColumnIfNotExists($pdo, 'user_accounts', 'auth_provider', 'VARCHAR(50) DEFAULT "credentials"');
    addColumnIfNotExists($pdo, 'user_accounts', 'avatar_url', 'TEXT');
    addColumnIfNotExists($pdo, 'user_accounts', 'nisn', 'VARCHAR(30) DEFAULT ""');
    addColumnIfNotExists($pdo, 'members', 'nisn', 'VARCHAR(30) DEFAULT ""');
    addColumnIfNotExists($pdo, 'members', 'is_verified', 'TINYINT(1) DEFAULT 0');
    addColumnIfNotExists($pdo, 'attendance', 'notes', 'TEXT');
    addColumnIfNotExists($pdo, 'announcements', 'author_name', 'VARCHAR(150) DEFAULT "Pengurus Ekskul"');
    addColumnIfNotExists($pdo, 'materials_assignments', 'attachment_url', 'TEXT');

    // Auto-seed or update default admin in user_accounts table
    try {
        $adminCount = $pdo->query("SELECT COUNT(*) FROM `user_accounts` WHERE `username` = 'admin'")->fetchColumn();
        if ((int)$adminCount === 0) {
            $stmt = $pdo->prepare("INSERT INTO `user_accounts` (`username`, `password`, `name`, `role`, `email`, `auth_provider`) 
                VALUES ('admin', :pass, 'Admin Robotic MAN 2 Kota Bekasi', 'admin', 'roboticman2kotabekasi@gmail.com', 'credentials')");
            $stmt->execute([':pass' => '3bb62e9d75c65289a724a94ec88ff9a0d1ff647652c00300d1c6dd1466bf15c0']);
        } else {
            $stmt = $pdo->prepare("UPDATE `user_accounts` SET `password` = :pass WHERE `username` = 'admin'");
            $stmt->execute([':pass' => '3bb62e9d75c65289a724a94ec88ff9a0d1ff647652c00300d1c6dd1466bf15c0']);
        }
    } catch (Exception $e) {}
}

// 3. Cryptographic Verification Helper (PBKDF2-SHA256, Salted Legacy SHA-256, Native PHP password_verify)
function verifyPasswordHashPHP($attempt, $stored) {
    if (!$attempt || !$stored) return false;
    $attempt = (string)$attempt;
    $stored = (string)$stored;

    // Direct match (plaintext fallback)
    if ($attempt === $stored) return true;

    // 1. PBKDF2 v2 (pbkdf2_v2$SALT$HASH) - 100,000 rounds
    if (strpos($stored, 'pbkdf2_v2$') === 0) {
        $parts = explode('$', $stored);
        if (count($parts) === 3 && !empty($parts[1]) && !empty($parts[2])) {
            $saltBin = @hex2bin($parts[1]);
            if ($saltBin !== false) {
                $computed = hash_pbkdf2('sha256', $attempt, $saltBin, 100000);
                if (hash_equals($parts[2], $computed)) return true;
            }
        }
    }

    // 2. PBKDF2 v1 (pbkdf2$HASH) - legacy fixed salt
    if (strpos($stored, 'pbkdf2$') === 0) {
        $salt = 'man2_robotics_auth_salt_2026_';
        $target = substr($stored, 7);
        $computed = hash_pbkdf2('sha256', $attempt, $salt, 100000);
        if (hash_equals($target, $computed)) return true;
    }

    // 3. Salted SHA-256 legacy (man2_robotics_auth_salt_2026_ + password)
    $legacySalt = 'man2_robotics_auth_salt_2026_';
    $legacySha = hash('sha256', $legacySalt . $attempt);
    if (hash_equals(strtolower($stored), strtolower($legacySha))) return true;

    // 4. Raw SHA-256
    $rawSha = hash('sha256', $attempt);
    if (hash_equals(strtolower($stored), strtolower($rawSha)) || hash_equals(strtolower($stored), 'sha256:' . strtolower($rawSha))) {
        return true;
    }

    // 5. Native PHP password_verify (bcrypt, argon2)
    if (strlen($stored) >= 60 && @password_verify($attempt, $stored)) {
        return true;
    }

    return false;
}

// PIN Verification Helper
function verifyPinPHP($attempt, $stored) {
    if (!$attempt || !$stored) return false;
    $cleanAttempt = preg_replace('/[^0-9]/', '', (string)$attempt);
    $cleanStored = preg_replace('/[^0-9]/', '', (string)$stored);
    if ($cleanAttempt && $cleanAttempt === $cleanStored) return true;
    return verifyPasswordHashPHP($cleanAttempt, $stored);
}

// Client IP resolver
function getClientIp() {
    if (!empty($_SERVER['HTTP_CF_CONNECTING_IP'])) return $_SERVER['HTTP_CF_CONNECTING_IP'];
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        return trim($ips[0]);
    }
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

// Anti-Brute Force Rate Limiter (Protects Login, PIN verification, and Account Recovery)
function checkRateLimit($pdo, $ip, $identifier, $type = 'login', $maxAttempts = 5, $windowMinutes = 15) {
    try {
        $cleanMinutes = (int)$windowMinutes;
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM login_attempts 
            WHERE (ip_address = :ip OR identifier = :id) 
              AND attempt_type = :type 
              AND attempt_time > (NOW() - INTERVAL $cleanMinutes MINUTE)");
        $stmt->execute([':ip' => $ip, ':id' => $identifier, ':type' => $type]);
        $count = (int)$stmt->fetchColumn();
        return $count < $maxAttempts;
    } catch (Exception $e) {
        return true;
    }
}

function recordFailedAttempt($pdo, $ip, $identifier, $type = 'login') {
    try {
        $stmt = $pdo->prepare("INSERT INTO login_attempts (ip_address, identifier, attempt_type) VALUES (:ip, :id, :type)");
        $stmt->execute([':ip' => $ip, ':id' => $identifier, ':type' => $type]);
    } catch (Exception $e) {}
}

function clearFailedAttempts($pdo, $ip, $identifier, $type = 'login') {
    try {
        $stmt = $pdo->prepare("DELETE FROM login_attempts WHERE (ip_address = :ip OR identifier = :id) AND attempt_type = :type");
        $stmt->execute([':ip' => $ip, ':id' => $identifier, ':type' => $type]);
    } catch (Exception $e) {}
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

        case 'admin-status':
        case 'auth/admin-status':
            echo json_encode([
                'status' => 'ok',
                'adminConfigured' => true,
                'firstRunSetupRequired' => false,
                'adminEmail' => 'roboticman2kotabekasi@gmail.com'
            ]);
            break;

        case 'env-config':
            echo json_encode([
                'adminEmail' => 'roboticman2kotabekasi@gmail.com',
                'supabaseUrl' => 'https://qtcwybixtafxuqqcsfcm.supabase.co',
                'supabaseAnonKey' => 'sb_publishable_7iBBXgluRLWJ0EKix2hdiQ_3UIx8Qhx',
            ]);
            break;

        case 'lookup_member':
            $nisn = isset($_GET['nisn']) ? trim($_GET['nisn']) : ($input['nisn'] ?? '');
            if (!$nisn) {
                echo json_encode(['success' => false, 'error' => 'NISN required']);
                break;
            }
            $cleanNisn = preg_replace('/[^0-9]/', '', $nisn);
            $stmt = $pdo->prepare("SELECT * FROM members 
                WHERE REPLACE(nisn, ' ', '') = :nisn 
                   OR REPLACE(id_member, ' ', '') = :nisn 
                   OR nisn = :raw
                   OR id_member = :raw
                LIMIT 1");
            $stmt->execute([':nisn' => $cleanNisn, ':raw' => trim($nisn)]);
            $found = $stmt->fetch();
            if ($found) {
                echo json_encode([
                    'success' => true,
                    'member' => [
                        'id_member' => $found['id_member'],
                        'nisn' => $found['nisn'] ?: $cleanNisn,
                        'fullName' => $found['full_name'],
                        'grade' => $found['grade'] ?: 'X',
                        'classRoom' => $found['class_room'] ?: 'A',
                        'status' => $found['status'] ?: 'Aktif',
                        'email' => $found['email'] ?: '',
                        'role' => $found['role'] ?: 'member',
                        'jabatan' => $found['jabatan'] ?: 'member',
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Member not found in MySQL']);
            }
            break;

        case 'setup_admin':
        case 'setup-admin':
        case 'auth/setup-admin':
            $newAdminPass = trim($input['password'] ?? '');
            if (strlen($newAdminPass) < 8) {
                echo json_encode(['success' => false, 'message' => 'Kata sandi admin minimal 8 karakter']);
                break;
            }
            $hashed = hash('sha256', $newAdminPass);
            $stmt = $pdo->prepare("UPDATE user_accounts SET password = :p WHERE username = 'admin'");
            $stmt->execute([':p' => $hashed]);
            echo json_encode([
                'success' => true,
                'message' => 'Password admin berhasil diatur',
                'account' => [
                    'username' => 'admin',
                    'name' => 'Admin Robotic MAN 2 Kota Bekasi',
                    'role' => 'admin',
                    'email' => 'roboticman2kotabekasi@gmail.com',
                    'authProvider' => 'credentials'
                ]
            ]);
            break;

        case 'promote_user':
        case 'admin/promote-user':
            $username = trim($input['username'] ?? '');
            $newRole = trim($input['newRole'] ?? ($input['role'] ?? ''));
            if (!$username || !$newRole) {
                echo json_encode(['success' => false, 'error' => 'Username dan role baru wajib diisi']);
                break;
            }
            $protectedAccounts = ['admin', 'pembina', 'roboticman2kotabekasi'];
            if (in_array(strtolower($username), $protectedAccounts)) {
                echo json_encode(['success' => false, 'error' => 'Role akun administrator utama dilindungi']);
                break;
            }
            $stmt = $pdo->prepare("UPDATE user_accounts SET role = :r WHERE username = :u");
            $stmt->execute([':r' => $newRole, ':u' => $username]);
            echo json_encode(['success' => true, 'message' => "Role $username berhasil diperbarui"]);
            break;

        case 'me':
        case 'auth/me':
            $u = trim($_GET['username'] ?? ($input['username'] ?? ''));
            if (!$u) {
                echo json_encode(['success' => false, 'error' => 'Username required']);
                break;
            }
            $stmt = $pdo->prepare("SELECT username, name, role, email, nisn, auth_provider, avatar_url FROM user_accounts WHERE LOWER(username) = :u LIMIT 1");
            $stmt->execute([':u' => strtolower($u)]);
            $foundUser = $stmt->fetch();
            if ($foundUser) {
                echo json_encode(['success' => true, 'user' => $foundUser]);
            } else {
                echo json_encode(['success' => false, 'error' => 'User not found']);
            }
            break;

        case 'register_user':
        case 'register-member':
        case 'auth/register-member':
            $username = trim($input['username'] ?? '');
            $password = trim($input['password'] ?? '');
            $name = trim($input['name'] ?? $username);
            $email = trim($input['email'] ?? '');
            $nisn = trim($input['nisn'] ?? '');
            $pin = trim($input['recoveryPin'] ?? ($input['recovery_pin'] ?? ''));
            $role = trim($input['role'] ?? 'Club Member');

            if (!$username || !$password) {
                echo json_encode(['success' => false, 'error' => 'Username and password required']);
                break;
            }

            // Keamanan: Lindungi root accounts agar tidak dapat ditimpa via self-registration
            $protectedAccounts = ['admin', 'pembina', 'roboticman2kotabekasi'];
            if (in_array(strtolower($username), $protectedAccounts)) {
                echo json_encode(['success' => false, 'error' => 'Username administrator dilindungi oleh sistem']);
                break;
            }

            // Keamanan: Cegah Privilege Escalation pada public self-registration
            $cleanRole = strtolower($role);
            if ($cleanRole === 'admin' || $cleanRole === 'pembina' || strpos($cleanRole, 'executive') !== false) {
                $role = 'Club Member';
            }

            $stmt = $pdo->prepare("INSERT INTO user_accounts 
                (username, password, name, role, email, nisn, recovery_pin, auth_provider)
                VALUES (:user, :pass, :name, :role, :email, :nisn, :pin, 'credentials')
                ON DUPLICATE KEY UPDATE 
                    password = VALUES(password), name = VALUES(name), email = VALUES(email),
                    nisn = VALUES(nisn), recovery_pin = VALUES(recovery_pin)");
            $stmt->execute([
                ':user' => $username,
                ':pass' => $password,
                ':name' => $name,
                ':role' => $role,
                ':email' => $email,
                ':nisn' => $nisn,
                ':pin' => $pin,
            ]);

            echo json_encode(['success' => true, 'message' => 'User registered successfully']);
            break;

        case 'login':
        case 'auth/login':
            $identifier = trim($input['identifier'] ?? '');
            $password = trim($input['password'] ?? '');
            if (!$identifier || !$password) {
                echo json_encode(['success' => false, 'error' => 'Identifier and password required']);
                break;
            }

            $clientIp = getClientIp();

            // Anti-Brute Force Protection: Max 5 gagal dalam 15 menit
            if (!checkRateLimit($pdo, $clientIp, $identifier, 'login', 5, 15)) {
                echo json_encode(['success' => false, 'error' => 'Terlalu banyak percobaan login gagal. Mohon tunggu 15 menit demi keamanan akun.']);
                break;
            }

            $cleanId = strtolower($identifier);
            $cleanNisn = preg_replace('/[^0-9]/', '', $identifier);

            $stmt = $pdo->prepare("SELECT * FROM user_accounts 
                WHERE LOWER(username) = :id 
                   OR LOWER(email) = :id 
                   OR (:nisn != '' AND REPLACE(nisn, ' ', '') = :nisn) 
                LIMIT 1");
            $stmt->execute([':id' => $cleanId, ':nisn' => $cleanNisn]);
            $user = $stmt->fetch();

            if ($user) {
                $storedPass = (string)$user['password'];
                $storedPin = (string)($user['recovery_pin'] ?? '');

                $passMatched = verifyPasswordHashPHP($password, $storedPass);
                $pinMatched = verifyPinPHP($password, $storedPin);

                if ($passMatched || $pinMatched) {
                    clearFailedAttempts($pdo, $clientIp, $identifier, 'login');
                    echo json_encode([
                        'success' => true,
                        'user' => [
                            'username' => $user['username'],
                            'name' => $user['name'],
                            'role' => $user['role'],
                            'email' => $user['email'],
                            'nisn' => $user['nisn'],
                            'auth_provider' => $user['auth_provider'] ?: 'credentials',
                            'avatar_url' => $user['avatar_url'] ?: '',
                            'authenticated' => true,
                        ]
                    ]);
                } else {
                    recordFailedAttempt($pdo, $clientIp, $identifier, 'login');
                    echo json_encode(['success' => false, 'error' => 'Kombinasi pengguna dan kata sandi salah.']);
                }
            } else {
                recordFailedAttempt($pdo, $clientIp, $identifier, 'login');
                echo json_encode(['success' => false, 'error' => 'Akun tidak ditemukan di database']);
            }
            break;

        case 'verify_pin':
        case 'verify-pin':
        case 'auth/verify-pin':
            $nisn = preg_replace('/[^0-9]/', '', $input['nisn'] ?? ($_GET['nisn'] ?? ''));
            $pin = trim($input['pin'] ?? '');
            if (!$nisn || !$pin) {
                echo json_encode(['success' => false, 'error' => 'NISN dan PIN wajib diisi']);
                break;
            }

            $clientIp = getClientIp();

            // Anti-Brute Force Protection on 4-digit PIN: Max 5 gagal dalam 15 menit
            if (!checkRateLimit($pdo, $clientIp, $nisn, 'pin', 5, 15)) {
                echo json_encode(['success' => false, 'error' => 'Terlalu banyak percobaan PIN salah. Akses pemulihan dibatasi 15 menit.']);
                break;
            }

            $stmt = $pdo->prepare("SELECT username, name, role, email, nisn, recovery_pin FROM user_accounts 
                WHERE REPLACE(nisn, ' ', '') = :nisn OR LOWER(username) = :u LIMIT 1");
            $stmt->execute([':nisn' => $nisn, ':u' => strtolower($nisn)]);
            $user = $stmt->fetch();
            if ($user) {
                $storedPin = (string)($user['recovery_pin'] ?? '');
                $isMatch = verifyPinPHP($pin, $storedPin);
                if ($isMatch) {
                    clearFailedAttempts($pdo, $clientIp, $nisn, 'pin');
                    echo json_encode([
                        'success' => true,
                        'account' => [
                            'username' => $user['username'],
                            'name' => $user['name'],
                            'role' => $user['role'],
                            'nisn' => $user['nisn'],
                        ]
                    ]);
                } else {
                    recordFailedAttempt($pdo, $clientIp, $nisn, 'pin');
                    echo json_encode(['success' => false, 'error' => 'PIN Pemulihan salah. Pastikan PIN 4-digit yang Anda masukkan benar.']);
                }
            } else {
                recordFailedAttempt($pdo, $clientIp, $nisn, 'pin');
                echo json_encode(['success' => false, 'error' => 'Akun dengan NISN ini belum terdaftar atau belum diaktivasi.']);
            }
            break;

        case 'reset_password_with_pin':
        case 'reset-password-with-pin':
        case 'auth/reset-password-with-pin':
        case 'recover-with-pin':
        case 'auth/recover-with-pin':
            $nisn = preg_replace('/[^0-9]/', '', $input['nisn'] ?? '');
            $pin = trim($input['pin'] ?? '');
            $newPassword = trim($input['newPassword'] ?? ($input['new_password'] ?? ''));
            if (!$nisn || !$pin || !$newPassword) {
                echo json_encode(['success' => false, 'error' => 'NISN, PIN, dan kata sandi baru wajib diisi']);
                break;
            }

            $clientIp = getClientIp();

            if (!checkRateLimit($pdo, $clientIp, $nisn, 'pin', 5, 15)) {
                echo json_encode(['success' => false, 'error' => 'Terlalu banyak percobaan PIN salah. Mohon tunggu 15 menit.']);
                break;
            }

            $stmt = $pdo->prepare("SELECT username, recovery_pin FROM user_accounts 
                WHERE REPLACE(nisn, ' ', '') = :nisn OR LOWER(username) = :u LIMIT 1");
            $stmt->execute([':nisn' => $nisn, ':u' => strtolower($nisn)]);
            $user = $stmt->fetch();
            if ($user) {
                $protectedAccounts = ['admin', 'pembina', 'roboticman2kotabekasi'];
                if (in_array(strtolower($user['username']), $protectedAccounts)) {
                    echo json_encode(['success' => false, 'error' => 'Akun administrator/pembina tidak dapat di-reset melalui menu pemulihan siswa.']);
                    break;
                }
                $storedPin = (string)($user['recovery_pin'] ?? '');
                $isMatch = verifyPinPHP($pin, $storedPin);
                if ($isMatch) {
                    clearFailedAttempts($pdo, $clientIp, $nisn, 'pin');
                    // If not already a pbkdf2 or hash string, store sha256 or as provided
                    $hashedPass = (strpos($newPassword, 'pbkdf2') === 0 || strlen($newPassword) === 64) 
                        ? $newPassword 
                        : hash('sha256', $newPassword);
                    $updateStmt = $pdo->prepare("UPDATE user_accounts SET password = :p WHERE username = :u");
                    $updateStmt->execute([':p' => $hashedPass, ':u' => $user['username']]);
                    echo json_encode(['success' => true, 'message' => 'Kata sandi berhasil diperbarui!']);
                } else {
                    recordFailedAttempt($pdo, $clientIp, $nisn, 'pin');
                    echo json_encode(['success' => false, 'error' => 'PIN Pemulihan tidak cocok.']);
                }
            } else {
                recordFailedAttempt($pdo, $clientIp, $nisn, 'pin');
                echo json_encode(['success' => false, 'error' => 'Akun tidak ditemukan.']);
            }
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
            $assignments = $pdo->query("SELECT * FROM materials_assignments ORDER BY created_at DESC")->fetchAll();

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
                    'assignments' => $assignments,
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
                // Cascade delete attendance and cash records in MySQL for this member
                $pdo->prepare("DELETE FROM attendance WHERE id_member = :id")->execute([':id' => $id]);
                $pdo->prepare("DELETE FROM cash_transactions WHERE id_member = :id")->execute([':id' => $id]);
                $stmt = $pdo->prepare("DELETE FROM members WHERE id_member = :id OR nisn = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing member id']);
            }
            break;

        case 'delete_attendance':
            $id = $input['id'] ?? ($_GET['id'] ?? '');
            $tanggal = $input['tanggal'] ?? '';
            $id_member = $input['id_member'] ?? '';
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM attendance WHERE id = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } elseif ($tanggal && $id_member) {
                $stmt = $pdo->prepare("DELETE FROM attendance WHERE tanggal = :tgl AND id_member = :mem");
                $stmt->execute([':tgl' => $tanggal, ':mem' => $id_member]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing attendance id or criteria']);
            }
            break;

        case 'delete_cash':
            $id = $input['id'] ?? ($_GET['id'] ?? '');
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM cash_transactions WHERE id = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing cash transaction id']);
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

        // --- FULL BACKUP CRUD FOR ANNOUNCEMENTS ---
        case 'fetch_announcements':
            $ann = $pdo->query("SELECT * FROM announcements ORDER BY created_at DESC")->fetchAll();
            echo json_encode(['success' => true, 'announcements' => $ann]);
            break;

        case 'upsert_announcement':
            $id = $input['id'] ?? uniqid('ann_');
            $title = $input['title'] ?? 'Pengumuman Baru';
            $content = $input['content'] ?? '';
            $eventDate = !empty($input['event_date']) ? date('Y-m-d H:i:s', strtotime($input['event_date'])) : null;
            $location = $input['location'] ?? 'Workshop Robotika roboman2';
            $author = $input['author_name'] ?? ($input['author'] ?? 'Pengurus Ekskul');

            $stmt = $pdo->prepare("INSERT INTO announcements (id, title, content, event_date, location, author_name)
                VALUES (:id, :title, :content, :event_date, :location, :author)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title), content = VALUES(content), event_date = VALUES(event_date),
                    location = VALUES(location), author_name = VALUES(author_name)");
            $stmt->execute([
                ':id' => $id,
                ':title' => $title,
                ':content' => $content,
                ':event_date' => $eventDate,
                ':location' => $location,
                ':author' => $author,
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'delete_announcement':
            $id = $input['id'] ?? ($_GET['id'] ?? '');
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM announcements WHERE id = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing announcement id']);
            }
            break;

        // --- FULL BACKUP CRUD FOR ASSIGNMENTS & MATERIALS ---
        case 'fetch_assignments':
            $assignments = $pdo->query("SELECT * FROM materials_assignments ORDER BY created_at DESC")->fetchAll();
            $formatted = array_map(function($a) {
                return [
                    'id' => $a['id'],
                    'title' => $a['title'],
                    'description' => $a['description'],
                    'type' => $a['type'],
                    'deadline' => $a['deadline'],
                    'attachment_url' => $a['attachment_url'],
                    'grading_type' => $a['grading_type'],
                    'max_score' => (float)$a['max_score'],
                    'created_by' => $a['created_by'],
                    'created_at' => $a['created_at'],
                ];
            }, $assignments);
            echo json_encode(['success' => true, 'assignments' => $formatted]);
            break;

        case 'upsert_assignment':
            $id = $input['id'] ?? uniqid('asg_');
            $title = $input['title'] ?? 'Materi / Tugas Baru';
            $desc = $input['description'] ?? '';
            $type = $input['type'] ?? 'material';
            $deadline = !empty($input['deadline']) ? date('Y-m-d H:i:s', strtotime($input['deadline'])) : null;
            $attachmentUrl = $input['attachment_url'] ?? '';
            $gradingType = $input['grading_type'] ?? 'numeric';
            $maxScore = (float)($input['max_score'] ?? 100);
            $createdBy = $input['created_by'] ?? '';

            $stmt = $pdo->prepare("INSERT INTO materials_assignments 
                (id, title, description, type, deadline, attachment_url, grading_type, max_score, created_by)
                VALUES (:id, :title, :desc, :type, :deadline, :attachment_url, :grading_type, :max_score, :created_by)
                ON DUPLICATE KEY UPDATE 
                    title = VALUES(title), description = VALUES(description), type = VALUES(type),
                    deadline = VALUES(deadline), attachment_url = VALUES(attachment_url),
                    grading_type = VALUES(grading_type), max_score = VALUES(max_score)");
            $stmt->execute([
                ':id' => $id,
                ':title' => $title,
                ':desc' => $desc,
                ':type' => $type,
                ':deadline' => $deadline,
                ':attachment_url' => $attachmentUrl,
                ':grading_type' => $gradingType,
                ':max_score' => $maxScore,
                ':created_by' => $createdBy,
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'delete_assignment':
            $id = $input['id'] ?? ($_GET['id'] ?? '');
            if ($id) {
                $pdo->prepare("DELETE FROM assignment_submissions WHERE assignment_id = :id")->execute([':id' => $id]);
                $stmt = $pdo->prepare("DELETE FROM materials_assignments WHERE id = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing assignment id']);
            }
            break;

        // --- FULL BACKUP CRUD FOR SUBMISSIONS ---
        case 'fetch_submissions':
            $assignmentId = $input['assignment_id'] ?? ($_GET['assignment_id'] ?? '');
            $studentId = $input['student_id'] ?? ($_GET['student_id'] ?? '');
            if ($assignmentId) {
                $stmt = $pdo->prepare("SELECT * FROM assignment_submissions WHERE assignment_id = :id ORDER BY submitted_at DESC");
                $stmt->execute([':id' => $assignmentId]);
            } elseif ($studentId) {
                $stmt = $pdo->prepare("SELECT * FROM assignment_submissions WHERE student_id = :id OR student_email = :id ORDER BY submitted_at DESC");
                $stmt->execute([':id' => $studentId]);
            } else {
                $stmt = $pdo->query("SELECT * FROM assignment_submissions ORDER BY submitted_at DESC");
            }
            $subs = $stmt->fetchAll();
            $formatted = array_map(function($s) {
                return [
                    'id' => $s['id'],
                    'assignment_id' => $s['assignment_id'],
                    'student_id' => $s['student_id'],
                    'student_email' => $s['student_email'],
                    'student_name' => $s['student_name'],
                    'submission_text' => $s['submission_text'],
                    'submission_link' => $s['submission_link'],
                    'status' => $s['status'],
                    'score_numeric' => $s['score_numeric'] !== null ? (float)$s['score_numeric'] : null,
                    'score_binary' => $s['score_binary'],
                    'feedback' => $s['feedback'],
                    'submitted_at' => $s['submitted_at'],
                    'graded_at' => $s['graded_at'],
                    'graded_by' => $s['graded_by'],
                ];
            }, $subs);
            echo json_encode(['success' => true, 'submissions' => $formatted]);
            break;

        case 'submit_assignment':
            $id = $input['id'] ?? uniqid('sub_');
            $assignmentId = $input['assignment_id'] ?? '';
            $studentId = $input['student_id'] ?? '';
            $email = $input['student_email'] ?? '';
            $name = $input['student_name'] ?? '';
            $text = $input['submission_text'] ?? '';
            $link = $input['submission_link'] ?? '';

            if (!$assignmentId || !$studentId) {
                echo json_encode(['success' => false, 'error' => 'Assignment ID and student ID required']);
                break;
            }

            $stmt = $pdo->prepare("INSERT INTO assignment_submissions 
                (id, assignment_id, student_id, student_email, student_name, submission_text, submission_link, status)
                VALUES (:id, :asg, :std, :email, :name, :text, :link, 'submitted')
                ON DUPLICATE KEY UPDATE 
                    submission_text = VALUES(submission_text), submission_link = VALUES(submission_link),
                    status = 'submitted', submitted_at = NOW()");
            $stmt->execute([
                ':id' => $id,
                ':asg' => $assignmentId,
                ':std' => $studentId,
                ':email' => $email,
                ':name' => $name,
                ':text' => $text,
                ':link' => $link,
            ]);
            echo json_encode(['success' => true, 'id' => $id]);
            break;

        case 'grade_submission':
            $id = $input['id'] ?? '';
            $scoreNum = isset($input['score_numeric']) ? (float)$input['score_numeric'] : null;
            $scoreBin = $input['score_binary'] ?? null;
            $feedback = $input['feedback'] ?? '';
            $gradedBy = $input['graded_by'] ?? 'Admin';

            if (!$id) {
                echo json_encode(['success' => false, 'error' => 'Submission ID required']);
                break;
            }

            $stmt = $pdo->prepare("UPDATE assignment_submissions SET 
                score_numeric = :score_num,
                score_binary = :score_bin,
                feedback = :feedback,
                status = 'graded',
                graded_at = NOW(),
                graded_by = :graded_by
                WHERE id = :id");
            $stmt->execute([
                ':id' => $id,
                ':score_num' => $scoreNum,
                ':score_bin' => $scoreBin,
                ':feedback' => $feedback,
                ':graded_by' => $gradedBy,
            ]);
            echo json_encode(['success' => true]);
            break;

        // --- FULL BACKUP CRUD FOR USER ACCOUNTS ---
        case 'fetch_users':
            $users = $pdo->query("SELECT username, name, role, email, nisn, auth_provider, avatar_url, created_at FROM user_accounts ORDER BY username ASC")->fetchAll();
            echo json_encode(['success' => true, 'users' => $users]);
            break;

        case 'delete_user':
            $username = trim($input['username'] ?? ($_GET['username'] ?? ''));
            if ($username) {
                $protectedAccounts = ['admin', 'pembina', 'roboticman2kotabekasi'];
                if (in_array(strtolower($username), $protectedAccounts)) {
                    echo json_encode(['success' => false, 'error' => 'Akun administrator/pembina utama dilindungi dan tidak boleh dihapus.']);
                    break;
                }
                $stmt = $pdo->prepare("DELETE FROM user_accounts WHERE username = :u");
                $stmt->execute([':u' => $username]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing username']);
            }
            break;

        // --- FULL BACKUP CRUD FOR ALLOWED MEMBERS ---
        case 'fetch_allowed_members':
            $allowed = $pdo->query("SELECT * FROM allowed_members ORDER BY nama_lengkap ASC")->fetchAll();
            echo json_encode(['success' => true, 'allowed_members' => $allowed]);
            break;

        case 'bulk_add_allowed_members':
            $membersList = $input['members'] ?? [];
            if (!empty($membersList) && is_array($membersList)) {
                $stmt = $pdo->prepare("INSERT INTO allowed_members 
                    (id, email, nama_lengkap, nis_atau_kelas, jabatan_ekskul, status_akun)
                    VALUES (:id, :email, :nama, :nis_kelas, :jabatan, 'unclaimed')
                    ON DUPLICATE KEY UPDATE 
                        nama_lengkap = VALUES(nama_lengkap), nis_atau_kelas = VALUES(nis_atau_kelas), jabatan_ekskul = VALUES(jabatan_ekskul)");
                foreach ($membersList as $m) {
                    $id = !empty($m['id']) ? $m['id'] : uniqid('allow_');
                    $email = strtolower(trim($m['email'] ?? ''));
                    if ($email) {
                        $stmt->execute([
                            ':id' => $id,
                            ':email' => $email,
                            ':nama' => $m['nama_lengkap'] ?? ($m['namaLengkap'] ?? 'Member'),
                            ':nis_kelas' => $m['nis_atau_kelas'] ?? ($m['nisAtauKelas'] ?? ''),
                            ':jabatan' => $m['jabatan_ekskul'] ?? ($m['jabatanEkskul'] ?? 'member'),
                        ]);
                    }
                }
            }
            echo json_encode(['success' => true]);
            break;

        case 'delete_allowed_member':
            $id = $input['id'] ?? ($input['email'] ?? ($_GET['id'] ?? ''));
            if ($id) {
                $stmt = $pdo->prepare("DELETE FROM allowed_members WHERE id = :id OR email = :id");
                $stmt->execute([':id' => $id]);
                echo json_encode(['success' => true]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing allowed member id']);
            }
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
