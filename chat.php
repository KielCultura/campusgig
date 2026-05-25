<?php
/**
 * CampusGig — chat.php
 * Place at: C:\xampp\htdocs\campusgig\chat.php  (or your Render root)
 *
 * Handles all messaging via Pusher REST API:
 *   get_conversations, open_conversation, get_messages,
 *   send_message, mark_read, unread_count
 *
 * ⚠️ Replace the 4 Pusher constants below with your actual credentials
 */

header('Content-Type: application/json');
$allowed = ['https://kielcultura.github.io'];
$origin  = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin && in_array($origin, $allowed, true)) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Vary: Origin');
    header('Access-Control-Allow-Credentials: true');
} else {
    header('Access-Control-Allow-Origin: *');
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Requested-With');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── Pusher credentials ────────────────────────────────────────────────────────
define('PUSHER_APP_ID',  getenv('PUSHER_APP_ID')  ?: 'YOUR_APP_ID');
define('PUSHER_KEY',     getenv('PUSHER_KEY')      ?: 'YOUR_KEY');
define('PUSHER_SECRET',  getenv('PUSHER_SECRET')   ?: 'YOUR_SECRET');
define('PUSHER_CLUSTER', getenv('PUSHER_CLUSTER')  ?: 'YOUR_CLUSTER');

// ── DB (same config as api.php) ───────────────────────────────────────────────
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'campusgig');

function db(): PDO {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host='.DB_HOST.';dbname='.DB_NAME.';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

function ok($data)  { echo json_encode(['ok'=>true,  'data'=>$data]);  exit; }
function err($msg)  { echo json_encode(['ok'=>false, 'error'=>$msg]);  exit; }
function body(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

// ── Pusher trigger (pure HTTP, no SDK needed) ─────────────────────────────────
function pusherTrigger(string $channel, string $event, array $data): void {
    $body      = json_encode($data);
    $timestamp = time();
    $path      = '/apps/'.PUSHER_APP_ID.'/events';
    $params    = [
        'auth_key'       => PUSHER_KEY,
        'auth_timestamp' => $timestamp,
        'auth_version'   => '1.0',
        'body_md5'       => md5($body),
        'channel'        => $channel,
        'name'           => $event,
    ];
    ksort($params);
    $toSign    = "POST\n{$path}\n".http_build_query($params);
    $signature = hash_hmac('sha256', $toSign, PUSHER_SECRET);
    $url = 'https://api-'.PUSHER_CLUSTER.'.pusher.com'.$path.'?'.http_build_query($params).'&auth_signature='.$signature;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $body,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    ]);
    curl_exec($ch);
    curl_close($ch);
}

// ── Ensure tables exist ───────────────────────────────────────────────────────
function ensureTables(): void {
    $pdo = db();
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS conversations (
            id         INT AUTO_INCREMENT PRIMARY KEY,
            user_a     INT NOT NULL,
            user_b     INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY uniq_pair (user_a, user_b),
            FOREIGN KEY (user_a) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (user_b) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS messages (
            id              INT AUTO_INCREMENT PRIMARY KEY,
            conversation_id INT NOT NULL,
            sender_id       INT NOT NULL,
            body            TEXT NOT NULL,
            is_read         TINYINT(1) NOT NULL DEFAULT 0,
            created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (sender_id)       REFERENCES users(id)         ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");
}

ensureTables();

$action  = $_GET['action'] ?? '';
$b       = body();
$userId  = intval($b['user_id'] ?? 0);
if (!$userId) err('Not authenticated');

switch ($action) {

    // ── List conversations for current user ───────────────────────────────────
    case 'get_conversations': {
        $st = db()->prepare("
            SELECT c.id,
                   IF(c.user_a = :me, c.user_b, c.user_a) AS other_id,
                   u.name  AS other_name,
                   u.role  AS other_role,
                   (SELECT body FROM messages WHERE conversation_id = c.id ORDER BY id DESC LIMIT 1) AS last_message,
                   (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != :me2 AND is_read = 0) AS unread_count
            FROM conversations c
            JOIN users u ON u.id = IF(c.user_a = :me3, c.user_b, c.user_a)
            WHERE c.user_a = :me4 OR c.user_b = :me5
            ORDER BY (SELECT MAX(id) FROM messages WHERE conversation_id = c.id) DESC
        ");
        $st->execute([':me'=>$userId,':me2'=>$userId,':me3'=>$userId,':me4'=>$userId,':me5'=>$userId]);
        ok($st->fetchAll());
    }

    // ── Open or create a conversation ─────────────────────────────────────────
    case 'open_conversation': {
        $otherId = intval($b['other_user_id'] ?? 0);
        if (!$otherId || $otherId === $userId) err('Invalid user');
        $a = min($userId, $otherId);
        $z = max($userId, $otherId);
        // Insert or ignore if already exists
        db()->prepare("INSERT IGNORE INTO conversations (user_a, user_b) VALUES (?,?)")->execute([$a,$z]);
        $st = db()->prepare("SELECT id FROM conversations WHERE user_a=? AND user_b=? LIMIT 1");
        $st->execute([$a,$z]);
        $conv = $st->fetch();
        ok(['id' => (int)$conv['id']]);
    }

    // ── Get messages for a conversation ───────────────────────────────────────
    case 'get_messages': {
        $convId = intval($b['conversation_id'] ?? 0);
        if (!$convId) err('conversation_id required');
        $st = db()->prepare("
            SELECT m.*, u.name AS sender
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = ?
            ORDER BY m.id ASC
            LIMIT 200
        ");
        $st->execute([$convId]);
        ok($st->fetchAll());
    }

    // ── Send a message ────────────────────────────────────────────────────────
    case 'send_message': {
        $convId = intval($b['conversation_id'] ?? 0);
        $body   = trim($b['body'] ?? '');
        if (!$convId || !$body) err('conversation_id and body required');

        // Verify sender is part of the conversation
        $chk = db()->prepare("SELECT * FROM conversations WHERE id=? AND (user_a=? OR user_b=?) LIMIT 1");
        $chk->execute([$convId, $userId, $userId]);
        $conv = $chk->fetch();
        if (!$conv) err('Forbidden');

        $ins = db()->prepare("INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)");
        $ins->execute([$convId, $userId, $body]);
        $msgId = (int)db()->lastInsertId();

        $st = db()->prepare("SELECT m.*, u.name AS sender FROM messages m JOIN users u ON u.id=m.sender_id WHERE m.id=?");
        $st->execute([$msgId]);
        $msg = $st->fetch();

        // Push to the OTHER user's channel
        $otherId = ($conv['user_a'] == $userId) ? $conv['user_b'] : $conv['user_a'];
        pusherTrigger('user-'.$otherId, 'new-message', [
            'conversation_id' => $convId,
            'message'         => $msg,
        ]);

        ok($msg);
    }

    // ── Mark messages as read ─────────────────────────────────────────────────
    case 'mark_read': {
        $convId = intval($b['conversation_id'] ?? 0);
        if (!$convId) err('conversation_id required');
        db()->prepare("UPDATE messages SET is_read=1 WHERE conversation_id=? AND sender_id != ?")->execute([$convId,$userId]);
        ok(true);
    }

    // ── Unread message count ──────────────────────────────────────────────────
    case 'unread_count': {
        $st = db()->prepare("
            SELECT COUNT(*) AS n FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE (c.user_a=? OR c.user_b=?) AND m.sender_id != ? AND m.is_read=0
        ");
        $st->execute([$userId,$userId,$userId]);
        ok((int)$st->fetch()['n']);
    }

    default: err('Unknown action');
}
