<?php
/**
 * roboman2 - Backend API Bridge untuk cPanel / Domainesia MySQL
 * Kompatibel dengan: PHP 7.4+, PHP 8.0+, PHP 8.1+, PHP 8.2+, PHP 8.3+
 */

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Konfigurasi Database MySQL (Domainesia cPanel)
$db_host = getenv('DB_HOST') ?: 'localhost';
$db_name = getenv('DB_NAME') ?: 'mankota1_robotik';
$db_user = getenv('DB_USER') ?: 'mankota1_robotik';
$db_pass = getenv('DB_PASSWORD') ?: '3Bh4-IR$4eh%aHyW';

try {
    $pdo = new PDO("mysql:host=$db_host;dbname=$db_name;charset=utf8mb4", $db_user, $db_pass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Koneksi database MySQL gagal: ' . $e->getMessage(),
        'tip' => 'Pastikan database sudah dibuat di cPanel dan user mankota1_robotik sudah diberi izin (All Privileges).'
    ], JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

$action = isset($_GET['action']) ? trim($_GET['action']) : '';
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?: [];

switch ($action) {
    case 'health':
    case 'ping':
        try {
            $stmt = $pdo->query("SHOW TABLES");
            $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
            echo json_encode([
                'success' => true,
                'status' => 'connected',
                'database' => $db_name,
                'tables_count' => count($tables),
                'tables' => $tables,
                'timestamp' => date('c')
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => $e->getMessage()]);
        }
        break;

    case 'members':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM members ORDER BY full_name ASC");
                $members = $stmt->fetchAll();
                echo json_encode(['success' => true, 'data' => $members]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        } elseif ($method === 'POST') {
            try {
                $m = $input;
                $id = $m['id_member'] ?: ($m['nisn'] ?: uniqid('m_'));
                $stmt = $pdo->prepare("INSERT INTO members (id_member, nisn, full_name, grade, class_room, gender, personal_phone, status, role, jabatan)
                    VALUES (:id, :nisn, :name, :grade, :room, :gender, :phone, :status, :role, :jabatan)
                    ON DUPLICATE KEY UPDATE full_name = VALUES(full_name), grade = VALUES(grade), class_room = VALUES(class_room), status = VALUES(status), jabatan = VALUES(jabatan)");
                $stmt->execute([
                    ':id' => $id,
                    ':nisn' => $m['nisn'] ?? '',
                    ':name' => $m['fullName'] ?? ($m['full_name'] ?? 'Member'),
                    ':grade' => $m['grade'] ?? 'X',
                    ':room' => $m['classRoom'] ?? ($m['class_room'] ?? 'A'),
                    ':gender' => $m['gender'] ?? 'Male',
                    ':phone' => $m['personalPhone'] ?? '',
                    ':status' => $m['status'] ?? 'Aktif',
                    ':role' => $m['role'] ?? 'member',
                    ':jabatan' => $m['jabatan'] ?? 'member',
                ]);
                echo json_encode(['success' => true, 'id' => $id]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;

    case 'attendance':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM attendance ORDER BY tanggal DESC");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;

    case 'cash':
        if ($method === 'GET') {
            try {
                $stmt = $pdo->query("SELECT * FROM cash_transactions ORDER BY tanggal DESC");
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()]);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;

    default:
        echo json_encode([
            'success' => true,
            'message' => 'roboman2 MySQL Backend API Bridge is ready.',
            'endpoints' => [
                'health' => '/api.php?action=health',
                'members' => '/api.php?action=members',
                'attendance' => '/api.php?action=attendance',
                'cash' => '/api.php?action=cash'
            ]
        ]);
        break;
}
