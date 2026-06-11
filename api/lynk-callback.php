<?php
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

// 1. Ambil data JSON mentah dari Webhook Lynk.id
$rawPayload = file_get_contents('php://input');
$payload = json_decode($rawPayload, true);

if (!$payload) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'msg' => 'Payload JSON kosong']);
    exit;
}

$event = $payload['event'] ?? '';
$data = $payload['data'] ?? [];

// Pastikan hanya memproses jika statusnya sudah lunas
if ($event !== 'order.paid') {
    echo json_encode(['status' => 'ignored', 'msg' => 'Bukan order.paid']);
    exit;
}

// 2. Tarik data utama pesanan pelanggan
$answers = $data['answers'] ?? [];
$target = $answers[0]['answer'] ?? ''; // Kolom pertama form Lynk (Username/Link)

$buyerEmail = $data['customer']['email'] ?? '';
$buyerName = $data['customer']['name'] ?? '';
$productName = $data['product']['name'] ?? '';
$invoiceId = $data['id'] ?? '';

// 3. MAPPING NAMA PRODUK LYNK -> PROVIDER + ID SERVICE + QUANTITY
$MAP_BY_NAME = [
    // PENGIKUT SALURAN WA - Provider Medanpedia, Service 5519
    '100 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 100],
    '200 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 200],
    '300 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 300],
    '400 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 400],
    '500 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 500],
    '600 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 600],
    '700 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 700],
    '800 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 800],
    '900 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 900],
    '1000 Pengikut Saluran WA' => ['provider' => 'medanpedia', 'service' => '5519', 'qty' => 1000],

    // VIEWS INSTAGRAM - Provider Indosmm, Service 6035
    '5000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 5000],
    '6500 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 6500],
    '8000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 8000],
    '9500 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 9500],
    '11000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 11000],
    '12500 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 12500],
    '14000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 14000],
    '15500 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 15500],
    '17000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 17000],
    '20000 Views Instagram' => ['provider' => 'indosmm', 'service' => '6035', 'qty' => 20000],

    // LIKE INSTAGRAM - Provider Indosmm, Service 7242
    '200 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 200],
    '300 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 300],
    '400 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 400],
    '500 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 500],
    '600 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 600],
    '700 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 700],
    '800 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 800],
    '900 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 900],
    '1000 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 1000],
    '1200 Like Instagram' => ['provider' => 'indosmm', 'service' => '7242', 'qty' => 1200],

    // FOLLOWERS IG INDO - Provider Indosmm, Service 574
    '100 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 100],
    '200 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 200],
    '300 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 300],
    '400 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 400],
    '500 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 500],
    '600 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 600],
    '700 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 700],
    '800 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 800],
    '900 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 900],
    '1000 Followers IG Indo' => ['provider' => 'indosmm', 'service' => '574', 'qty' => 1000],

    // FOLLOWERS INSTAGRAM - Provider Indosmm, Service 8303
    '100 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 100],
    '200 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 200],
    '300 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 300],
    '400 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 400],
    '500 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 500],
    '600 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 600],
    '700 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 700],
    '800 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 800],
    '900 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 900],
    '1000 Followers Instagram' => ['provider' => 'indosmm', 'service' => '8303', 'qty' => 1000],
];

if (!isset($MAP_BY_NAME[$productName])) {
    echo json_encode(['status' => 'error', 'msg' => "Produk '$productName' belum di-mapping."]);
    exit;
}

$mapData = $MAP_BY_NAME[$productName];
$provider = $mapData['provider'];
$serviceId = $mapData['service'];
$quantity = $mapData['qty'];

if (empty($target)) {
    echo json_encode(['status' => 'error', 'msg' => 'Kolom target/username kosong']);
    exit;
}

$apiResult = '';

// 4. Proses Otomatis Tembak API Panel SMM
if ($provider === 'indosmm') {
    $indosmmKey = getenv('INDOSMM_KEY');
    if (!$indosmmKey) {
        echo json_encode(['status' => 'error', 'msg' => 'INDOSMM_KEY kosong di Vercel Env']);
        exit;
    }

    $ch = curl_init('https://indosmm.com/api/v2');
    $postData = [
        'key' => $indosmmKey,
        'action' => 'add',
        'service' => $serviceId,
        'target' => $target,
        'quantity' => $quantity
    ];
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResult = curl_exec($ch);
    curl_close($ch);

} else if ($provider === 'medanpedia') {
    $medanApiId = getenv('MEDAN_API_ID');
    $medanApiKey = getenv('MEDAN_API_KEY');
    if (!$medanApiId || !$medanApiKey) {
        echo json_encode(['status' => 'error', 'msg' => 'Env MEDAN_API belum diset di Vercel']);
        exit;
    }

    $ch = curl_init('https://api.medanpedia.co.id/order');
    $postData = [
        'api_id' => $medanApiId,
        'api_key' => $medanApiKey,
        'service' => $serviceId,
        'target' => $target,
        'quantity' => $quantity
    ];
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($postData));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $apiResult = curl_exec($ch);
    curl_close($ch);
}

// Berikan respon balik sukses ke Lynk.id
echo json_encode([
    'status' => 'ok',
    'invoice' => $invoiceId,
    'provider' => $provider,
    'smm_response' => json_decode($apiResult, true) ?: $apiResult
]);
