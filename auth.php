<?php

declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/database.php';

$action = $_GET['action'] ?? ($_POST['action'] ?? '');

function json_exit(bool $success, string $message = '', array $data = [], int $status = 200): void
{
    http_response_code($status);
    echo json_encode(array_merge(['success' => $success, 'message' => $message], $data));
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST' && !isset($_POST['action'])) {
    $input = json_decode(file_get_contents('php://input'), true);
    if (is_array($input)) {
        $_POST = $input;
        $action = $_POST['action'] ?? '';
    }
}

try {
    if ($action === 'session') {
        if (!isset($_SESSION['user'])) {
            json_exit(true, '', ['user' => null]);
        }

        $statement = database()->prepare(
            'SELECT id, name, email, role, phone FROM users WHERE id = ? LIMIT 1'
        );
        $statement->execute([$_SESSION['user']['id']]);
        $user = $statement->fetch();

        if (!$user) {
            $_SESSION = [];
            json_exit(true, '', ['user' => null]);
        }

        $_SESSION['user'] = [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'phone' => $user['phone'],
        ];
        json_exit(true, '', ['user' => $_SESSION['user']]);
    }

    if ($action === 'logout') {
        $_SESSION = [];
        if (ini_get('session.use_cookies')) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
        }
        session_destroy();
        json_exit(true, 'Berhasil keluar.');
    }

    if ($action === 'register') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_exit(false, 'Metode tidak valid.', [], 405);
        }

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $phone = trim((string) ($_POST['phone'] ?? ''));
        $password = (string) ($_POST['password'] ?? '');
        $passwordConfirmation = (string) ($_POST['password_confirmation'] ?? '');

        if ($name === '' || $email === '' || $phone === '' || $password === '') {
            json_exit(false, 'Nama, email, nomor telepon, dan password wajib diisi.', [], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_exit(false, 'Format email tidak valid.', [], 422);
        }
        if (strlen($password) < 6) {
            json_exit(false, 'Password minimal 6 karakter.', [], 422);
        }
        if ($password !== $passwordConfirmation) {
            json_exit(false, 'Konfirmasi password tidak sama.', [], 422);
        }

        $pdo = database();
        $existing = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $existing->execute([$email]);
        if ($existing->fetch()) {
            json_exit(false, 'Email sudah digunakan oleh akun lain.', [], 409);
        }

        $statement = $pdo->prepare(
            'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, \'user\', ?)'
        );
        $statement->execute([$name, $email, password_hash($password, PASSWORD_BCRYPT), $phone ?: null]);
        $userId = (int) $pdo->lastInsertId();

        $_SESSION['user'] = ['id' => $userId, 'name' => $name, 'email' => $email, 'role' => 'user', 'phone' => $phone ?: null];
        json_exit(true, 'Akun berhasil dibuat. Selamat datang!', ['user' => $_SESSION['user']], 201);
    }

    if ($action === 'login') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            json_exit(false, 'Metode tidak valid.', [], 405);
        }

        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $password = (string) ($_POST['password'] ?? '');

        if ($email === '' || $password === '') {
            json_exit(false, 'Email dan password wajib diisi.', [], 422);
        }

        $statement = database()->prepare(
            'SELECT id, name, email, password_hash, role, phone FROM users WHERE email = ? LIMIT 1'
        );
        $statement->execute([$email]);
        $user = $statement->fetch();

        if (!$user || !password_verify($password, $user['password_hash'])) {
            json_exit(false, 'Email atau password tidak sesuai.', [], 401);
        }

        $_SESSION['user'] = [
            'id' => (int) $user['id'],
            'name' => $user['name'],
            'email' => $user['email'],
            'role' => $user['role'],
            'phone' => $user['phone'],
        ];
        json_exit(true, 'Login berhasil.', ['user' => $_SESSION['user']]);
    }

    if ($action === 'update-profile') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user']['id'])) {
            json_exit(false, 'Silakan login kembali.', [], 401);
        }

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $phone = trim((string) ($_POST['phone'] ?? ''));

        if ($name === '' || $email === '') {
            json_exit(false, 'Nama dan email wajib diisi.', [], 422);
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            json_exit(false, 'Format email tidak valid.', [], 422);
        }

        $pdo = database();
        $existing = $pdo->prepare('SELECT id FROM users WHERE email = ? AND id != ? LIMIT 1');
        $existing->execute([$email, $_SESSION['user']['id']]);
        if ($existing->fetch()) {
            json_exit(false, 'Email sudah digunakan oleh akun lain.', [], 409);
        }

        $statement = $pdo->prepare('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?');
        $statement->execute([$name, $email, $phone ?: null, $_SESSION['user']['id']]);
        $_SESSION['user']['name'] = $name;
        $_SESSION['user']['email'] = $email;
        $_SESSION['user']['phone'] = $phone ?: null;

        json_exit(true, 'Profil berhasil diperbarui.', ['user' => $_SESSION['user']]);
    }

    if ($action === 'change-password') {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST' || !isset($_SESSION['user']['id'])) {
            json_exit(false, 'Silakan login kembali.', [], 401);
        }

        $currentPassword = (string) ($_POST['current_password'] ?? '');
        $newPassword = (string) ($_POST['new_password'] ?? '');
        $confirmation = (string) ($_POST['password_confirmation'] ?? '');

        if ($currentPassword === '' || $newPassword === '' || $confirmation === '') {
            json_exit(false, 'Semua kolom password wajib diisi.', [], 422);
        }
        if (strlen($newPassword) < 6) {
            json_exit(false, 'Password baru minimal 6 karakter.', [], 422);
        }
        if ($newPassword !== $confirmation) {
            json_exit(false, 'Konfirmasi password baru tidak sama.', [], 422);
        }

        $pdo = database();
        $statement = $pdo->prepare('SELECT password_hash FROM users WHERE id = ? LIMIT 1');
        $statement->execute([$_SESSION['user']['id']]);
        $user = $statement->fetch();

        if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
            json_exit(false, 'Password saat ini tidak sesuai.', [], 401);
        }

        $statement = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $statement->execute([password_hash($newPassword, PASSWORD_BCRYPT), $_SESSION['user']['id']]);
        json_exit(true, 'Password berhasil diperbarui.');
    }

    json_exit(false, 'Aksi tidak dikenali.', [], 404);
} catch (Throwable $exception) {
    json_exit(false, 'Terjadi kesalahan pada server.', [], 500);
}
