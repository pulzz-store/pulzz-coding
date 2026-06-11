<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$request_data = $_POST; // Ambil POST aja, lebih aman

if (empty($request_data['key']) || empty($request_data['action'])) {
    echo json_encode(['status' => 'error', 'msg' => 'Data kosong. Kirim key, action, dll']);
    exit();
}

$indosmm_url = 'https://indosmm.com/api'; // <- INI URL YG BENER

$ch = curl_init($indosmm_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => http_build_query($request_data),
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
    CURLOPT_TIMEOUT => 30,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded']
]);

$response = curl_exec($ch);

if(curl_errno($ch)) {
    echo json_encode(['status' => 'error', 'msg' => 'Curl Error: ' . curl_error($ch)]);
} else {
    echo $response; 
}
curl_close($ch);
?>