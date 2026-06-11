<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 

class Api
{
    public $api_url = 'https://indosmm.id/api/v2'; // Dari API Docs lu
    public $api_key = 'ISI_API_KEY_KAMU_DISINI'; // <- GANTI INI

    public function order($data)
    {
        $post = array_merge(['key' => $this->api_key, 'action' => 'add'], $data);
        return json_decode((string)$this->connect($post));
    }

    public function status($order_id)
    {
        return json_decode(
            $this->connect([
                'key' => $this->api_key,
                'action' => 'status',
                'order' => $order_id
            ])
        );
    }

    public function services()
    {
        return json_decode(
            $this->connect([
                'key' => $this->api_key,
                'action' => 'services',
            ])
        );
    }

    public function balance()
    {
        return json_decode(
            $this->connect([
                'key' => $this->api_key,
                'action' => 'balance', // Indosmm pake 'balance' bukan 'keseimbangan'
            ])
        );
    }

    private function connect($post)
    {
        $_post = [];
        if (is_array($post)) {
            foreach ($post as $name => $value) {
                $_post[] = $name . '=' . urlencode($value);
            }
        }

        $ch = curl_init($this->api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HEADER, 0);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);

        if (is_array($post)) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, join('&', $_post));
        }
        curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0');

        $result = curl_exec($ch);
        if (curl_errno($ch) != 0 && empty($result)) {
            $result = false;
        }
        curl_close($ch);
        return $result;
    }
}

// Jembatan: Terima POST dari HTML lu
$request_data = $_POST;

if (empty($request_data['key']) || empty($request_data['action'])) {
    echo json_encode(['status' => 'error', 'msg' => 'Data kosong. Kirim key, action, dll']);
    exit();
}

$api = new Api();
$api->api_key = $request_data['key']; // Ambil key dari HTML, bukan hardcode

$action = $request_data['action'];
$response = null;

try {
    switch($action) {
        case 'profile': // HTML lu panggil profile buat cek saldo
        case 'balance': 
            $response = $api->balance();
            break;
        
        case 'services':
            $response = $api->services();
            break;

        case 'add': // HTML lu panggil add buat order
        case 'order':
            unset($request_data['key'], $request_data['action']);
            $response = $api->order($request_data);
            break;

        case 'status':
            $response = $api->status($request_data['order']);
            break;

        default:
            $response = ['status' => 'error', 'msg' => 'Action tidak dikenal: ' . $action];
    }

    // Kalau class balikin object, encode lagi ke JSON biar HTML lu bisa baca
    echo json_encode($response);

} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'msg' => $e->getMessage()]);
}
?>
