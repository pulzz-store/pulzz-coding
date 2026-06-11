<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$MEDAN_API_ID = '50098';
$MEDAN_API_URL = 'https://api.medanpedia.co.id';
$action = $_POST['action']?? '';

function callMedan($endpoint, $postFields) {
    global $MEDAN_API_URL;
    $ch = curl_init($MEDAN_API_URL. $endpoint);
    curl_setopt_array($ch, [CURLOPT_POST=>true, CURLOPT_POSTFIELDS=>$postFields, CURLOPT_RETURNTRANSFER=>true, CURLOPT_TIMEOUT=>30, CURLOPT_SSL_VERIFYPEER=>false]);
    $response = curl_exec($ch); $err = curl_error($ch); curl_close($ch);
    if ($err) return json_encode(['status' => false, 'msg' => 'Curl Error: '. $err]);
    return $response;
}

if ($action === 'profile') {
    $api_key = trim($_POST['api_key']?? '');
    if (empty($api_key)) exit(json_encode(['status' => false, 'msg' => 'API Key kosong']));
    echo callMedan('/profile', http_build_query(['api_id'=>$MEDAN_API_ID,'api_key'=>$api_key]));
    exit;
}
if ($action === 'order') {
    $api_key = trim($_POST['api_key']?? '');
    $service = trim($_POST['service']?? '');
    $target = trim($_POST['target']?? '');
    $quantity = trim($_POST['quantity']?? '');
    if (empty($api_key) || empty($service) || empty($target) || empty($quantity)) exit(json_encode(['status' => false, 'msg' => 'Parameter kurang lengkap']));
    echo callMedan('/order', http_build_query(['api_id'=>$MEDAN_API_ID,'api_key'=>$api_key,'service'=>$service,'target'=>$target,'quantity'=>$quantity]));
    exit;
}
if ($action === 'status') {
    $api_key = trim($_POST['api_key']?? ''); $id = trim($_POST['id']?? '');
    if (empty($api_key) || empty($id)) exit(json_encode(['status' => false, 'msg' => 'Parameter kurang lengkap']));
    echo callMedan('/status', http_build_query(['api_id'=>$MEDAN_API_ID,'api_key'=>$api_key,'id'=>$id]));
    exit;
}
if ($action === 'services') {
    $api_key = trim($_POST['api_key']?? '');
    if (empty($api_key)) exit(json_encode(['status' => false, 'msg' => 'API Key kosong']));
    echo callMedan('/services', http_build_query(['api_id'=>$MEDAN_API_ID,'api_key'=>$api_key]));
    exit;
}
echo json_encode(['status' => false, 'msg' => 'Action tidak valid']);
?>