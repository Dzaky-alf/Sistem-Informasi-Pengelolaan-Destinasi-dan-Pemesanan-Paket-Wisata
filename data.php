<?php

declare(strict_types=1);

session_start();
header('Content-Type: application/json');

require_once __DIR__ . '/database.php';

$action = $_POST['action'] ?? ($_GET['action'] ?? '');

function data_json(bool $success, string $message = '', array $data = [], int $status = 200): void
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
    $pdo = database();

    if ($action === 'list-destinations') {
        if (!isset($_SESSION['user']['id'])) {
            data_json(false, 'Silakan login kembali.', [], 401);
        }

        $statement = $pdo->query(
            'SELECT d.id, d.name, d.region, c.name AS category, d.rating, d.visits,
                    d.image_url, d.description
             FROM destinations d
             INNER JOIN categories c ON c.id = d.category_id
             ORDER BY d.id ASC'
        );

        $destinations = array_map(static function(array $destination): array {
            return [
                'id' => 'd' . $destination['id'],
                'database_id' => (int) $destination['id'],
                'name' => $destination['name'],
                'region' => $destination['region'],
                'cat' => $destination['category'],
                'rating' => (float) $destination['rating'],
                'visits' => (int) $destination['visits'],
                'img' => $destination['image_url'],
                'desc' => $destination['description'],
            ];
        }, $statement->fetchAll());

        data_json(true, '', ['destinations' => $destinations]);
    }

    if ($action === 'add-destination') {
        if (!isset($_SESSION['user']['id']) || $_SESSION['user']['role'] !== 'admin') {
            data_json(false, 'Hanya admin yang dapat menambah destinasi.', [], 403);
        }

        $name = trim((string) ($_POST['name'] ?? ''));
        $region = trim((string) ($_POST['region'] ?? ''));
        $category = trim((string) ($_POST['cat'] ?? ''));
        $rating = (float) ($_POST['rating'] ?? 0);
        $image = trim((string) ($_POST['img'] ?? ''));
        $description = trim((string) ($_POST['desc'] ?? ''));

        if ($name === '' || $region === '' || $category === '' || $image === '' || $description === '') {
            data_json(false, 'Semua data destinasi wajib diisi.', [], 422);
        }
        if ($rating < 0 || $rating > 5) {
            data_json(false, 'Rating harus antara 0 sampai 5.', [], 422);
        }
        if (!filter_var($image, FILTER_VALIDATE_URL) || !preg_match('/^https?:\\/\\//i', $image)) {
            data_json(false, 'Link gambar harus berupa URL HTTP atau HTTPS yang valid.', [], 422);
        }

        $categoryStatement = $pdo->prepare('SELECT id FROM categories WHERE name = ? LIMIT 1');
        $categoryStatement->execute([$category]);
        $categoryRow = $categoryStatement->fetch();
        if (!$categoryRow) {
            data_json(false, 'Kategori destinasi tidak ditemukan.', [], 422);
        }

        $statement = $pdo->prepare(
            'INSERT INTO destinations (name, region, category_id, rating, visits, image_url, description)
             VALUES (?, ?, ?, ?, 0, ?, ?)'
        );
        $statement->execute([$name, $region, (int) $categoryRow['id'], $rating, $image, $description]);

        data_json(true, 'Destinasi berhasil ditambahkan.', [
            'destination' => [
                'id' => (int) $pdo->lastInsertId(),
                'name' => $name,
                'region' => $region,
                'cat' => $category,
                'rating' => $rating,
                'visits' => 0,
                'img' => $image,
                'desc' => $description,
            ],
        ], 201);
    }

    if ($action === 'create-booking') {
        if (!isset($_SESSION['user']['id']) || $_SESSION['user']['role'] !== 'user') {
            data_json(false, 'Silakan login sebagai pengguna untuk membuat pemesanan.', [], 401);
        }

        $name = trim((string) ($_POST['name'] ?? ''));
        $email = strtolower(trim((string) ($_POST['email'] ?? '')));
        $packageName = trim((string) ($_POST['package_name'] ?? ''));
        $departureDate = trim((string) ($_POST['date'] ?? ''));
        $guests = (int) ($_POST['guests'] ?? 0);
        $total = (int) ($_POST['total'] ?? 0);
        $notes = trim((string) ($_POST['notes'] ?? ''));
        $frontendPackageId = trim((string) ($_POST['package_id'] ?? ''));

        if ($name === '' || $email === '' || $packageName === '' || $departureDate === '') {
            data_json(false, 'Data pemesanan belum lengkap.', [], 422);
        }
        if ($guests < 1 || $total < 0 || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $departureDate)) {
            data_json(false, 'Tanggal, peserta, atau total pemesanan tidak valid.', [], 422);
        }

        $numericPackageId = filter_var($frontendPackageId, FILTER_VALIDATE_INT);
        $packageId = $numericPackageId !== false ? (int) $numericPackageId : null;
        if (!$packageId) {
            $packageStatement = $pdo->prepare('SELECT id FROM packages WHERE name = ? LIMIT 1');
            $packageStatement->execute([$packageName]);
            $packageId = (int) ($packageStatement->fetchColumn() ?: 0) ?: null;
        }
        if (!$packageId) {
            data_json(false, 'Paket wisata wajib dipilih.', [], 422);
        }
        $bookingCode = 'NSA-' . substr((string) (time() * 1000), -6);

        $statement = $pdo->prepare(
            'INSERT INTO bookings
             (booking_code, user_id, package_id, package_name, customer_name, customer_email,
              departure_date, guests, total_price, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        $statement->execute([
            $bookingCode,
            $_SESSION['user']['id'],
            $packageId,
            $packageName,
            $name,
            $email,
            $departureDate,
            $guests,
            $total,
            'Menunggu pembayaran',
            $notes ?: null,
        ]);

        data_json(true, 'Pemesanan berhasil disimpan.', [
            'booking' => [
                'id' => $bookingCode,
                'database_id' => (int) $pdo->lastInsertId(),
                'pkg' => $frontendPackageId,
                'name' => $name,
                'email' => $email,
                'date' => $departureDate,
                'guests' => $guests,
                'total' => $total,
                'status' => 'Menunggu pembayaran',
                'notes' => $notes,
            ],
        ], 201);
    }

    if ($action === 'list-bookings') {
        if (!isset($_SESSION['user']['id'])) {
            data_json(false, 'Silakan login kembali.', [], 401);
        }

        if ($_SESSION['user']['role'] === 'admin') {
            $statement = $pdo->query(
                'SELECT booking_code AS id, package_id, package_name, customer_name AS name, customer_email AS email,
                        departure_date AS date, guests, total_price AS total, status, notes
                 FROM bookings ORDER BY created_at DESC'
            );
        } else {
            $statement = $pdo->prepare(
                'SELECT booking_code AS id, package_id, package_name, customer_name AS name, customer_email AS email,
                        departure_date AS date, guests, total_price AS total, status, notes
                 FROM bookings WHERE user_id = ? ORDER BY created_at DESC'
            );
            $statement->execute([$_SESSION['user']['id']]);
        }

        $rows = $statement->fetchAll();
        foreach ($rows as &$row) {
            $row['pkg'] = 'p' . ($row['package_id'] ?: '');
            $row['total'] = (int) $row['total'];
            $row['guests'] = (int) $row['guests'];
        }
        unset($row);

        data_json(true, '', ['bookings' => $rows]);
    }

    if ($action === 'update-booking-status') {
        if (!isset($_SESSION['user']['id'])) {
            data_json(false, 'Silakan login kembali.', [], 401);
        }

        $bookingCode = trim((string) ($_POST['booking_code'] ?? ''));
        $status = trim((string) ($_POST['status'] ?? ''));
        $method = trim((string) ($_POST['method'] ?? ''));
        $allowedStatuses = ['Menunggu pembayaran', 'Pembayaran berhasil', 'Selesai', 'Dibatalkan'];

        if ($bookingCode === '' || !in_array($status, $allowedStatuses, true)) {
            data_json(false, 'Status atau pemesanan tidak valid.', [], 422);
        }

        $ownerClause = $_SESSION['user']['role'] === 'admin' ? '' : ' AND user_id = ?';
        $statement = $pdo->prepare('SELECT id, total_price FROM bookings WHERE booking_code = ?' . $ownerClause . ' LIMIT 1');
        $statement->execute($_SESSION['user']['role'] === 'admin' ? [$bookingCode] : [$bookingCode, $_SESSION['user']['id']]);
        $booking = $statement->fetch();

        if (!$booking) {
            data_json(false, 'Pemesanan tidak ditemukan atau bukan milik akun ini.', [], 404);
        }

        $pdo->beginTransaction();
        $update = $pdo->prepare('UPDATE bookings SET status = ? WHERE id = ?');
        $update->execute([$status, $booking['id']]);

        if ($status === 'Pembayaran berhasil' && in_array($method, ['Transfer bank', 'QRIS', 'E-wallet'], true)) {
            $payment = $pdo->prepare('SELECT id FROM payments WHERE booking_id = ? LIMIT 1');
            $payment->execute([$booking['id']]);
            if (!$payment->fetch()) {
                $insertPayment = $pdo->prepare(
                    'INSERT INTO payments (booking_id, method, amount) VALUES (?, ?, ?)'
                );
                $insertPayment->execute([$booking['id'], $method, $booking['total_price']]);
            }
        }

        $pdo->commit();
        data_json(true, 'Status pembayaran berhasil diperbarui.', ['status' => $status]);
    }

    data_json(false, 'Aksi tidak dikenali.', [], 404);
} catch (Throwable $exception) {
    data_json(false, 'Terjadi kesalahan pada server.', [], 500);
}
