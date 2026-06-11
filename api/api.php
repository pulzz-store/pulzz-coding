<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight request dari Vercel
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

class Api
{
    // URL INI YG BENER BUAT INDOSMM
    public $api_url = 'https://indosmm.com/api/v2'; 
    public $api_key = ''; // Kosongin, nanti diisi dari POST

    public function order($data)
    {
        // Indosmm pake action=add buat order baru
        $post = array_merge(['key' => $this->api_key, 'action' => 'add'], $data);
        return $this->connect($post);
    }

    public function status($order_id)
    {
        return $this->connect([
            'key' => $this->api_key,
            'action' => 'status',
            'order' => $order_id
        ]);
    }

    public function services()
    {
        return $this->connect([
            'key' => $this->api_key,
            'action' => 'services',
        ]);
    }

    public function balance()
    {
        return $this->connect([
            'key' => $this->api_key,
            'action' => 'balance',
        ]);
    }

    private function connect($post)
    {
        $ch = curl_init($this->api_url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => http_build_query($post),
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
            CURLOPT_TIMEOUT => 30,
            CURLOPT_USERAGENT => 'PulzzStore-Bot/1.0'
        ]);

        $result = curl_exec($ch);
        if(curl_errno($ch)) {
            curl_close($ch);
            return json_encode(['status' => 'error', 'msg' => 'Curl Error: ' . curl_error($ch)]);
        }
        curl_close($ch);
        return $result; // Langsung balikin JSON dari Indosmm
    }
}

// Jembatan: Terima POST dari lynk-callback.js
$request_data = $_POST;

if (empty($request_data['key']) || empty($request_data['action'])) {
    echo json_encode(['status' => 'error', 'msg' => 'Data kosong. Kirim key, action, dll']);
    exit();
}

$api = new Api();
$api->api_key = $request_data['key']; // Ambil key dari lynk-callback.js

$action = $request_data['action'];
$response = null;

try {
    switch($action) {
        case 'balance': 
        case 'profile': // Biar cocok kalo ada yg manggil profile
            $response = $api->balance();
            break;
        
        case 'services':
            $response = $api->services();
            break;

        case 'order': // Ini yg dipanggil lynk-callback.js
        case 'add':
            unset($request_data['key'], $request_data['action']);
            $response = $api->order($request_data);
            break;

        case 'status':
            $response = $api->status($request_data['order']);
            break;

        default:
            $response = json_encode(['status' => 'error', 'msg' => 'Action tidak dikenal: ' . $action]);
    }

    echo $response; // Udah JSON, tinggal echo

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'msg' => $e->getMessage()]);
}
?>
