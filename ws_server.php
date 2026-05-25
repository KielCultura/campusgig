<?php
/**
 * CampusGig WebSocket Server  –  ws_server.php
 *
 * Place in:  C:\xampp\htdocs\campusgig\ws_server.php
 *
 * SETUP (one-time):
 *   1. Install Composer:  https://getcomposer.org/download/
 *   2. Open CMD in C:\xampp\htdocs\campusgig\
 *   3. Run:  composer install
 *   4. Start server:  php ws_server.php
 *      (Keep this CMD window open while using the app)
 *
 * Listens on:  ws://localhost:8080
 */

require __DIR__ . '/vendor/autoload.php';

use Ratchet\Server\IoServer;
use Ratchet\Http\HttpServer;
use Ratchet\WebSocket\WsServer;
use Ratchet\MessageComponentInterface;
use Ratchet\ConnectionInterface;

// ── DB CONFIG (must match api.php) ────────────────────────────────────────────
define('WS_DB_HOST', 'localhost');
define('WS_DB_USER', 'root');
define('WS_DB_PASS', '');
define('WS_DB_NAME', 'campusgig');

class CampusGigChat implements MessageComponentInterface
{
    /** @var \SplObjectStorage */
    protected $clients;

    /** @var array  userId => ConnectionInterface */
    protected $userConnections = [];

    /** @var PDO */
    protected $db;

    public function __construct()
    {
        $this->clients = new \SplObjectStorage;
        $this->db = new PDO(
            'mysql:host=' . WS_DB_HOST . ';dbname=' . WS_DB_NAME . ';charset=utf8mb4',
            WS_DB_USER, WS_DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
        echo "CampusGig WebSocket server started.\n";
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $this->clients->attach($conn);
        echo "New connection: {$conn->resourceId}\n";
    }

    public function onMessage(ConnectionInterface $from, $rawMsg)
    {
        $data = json_decode($rawMsg, true);
        if (!$data || !isset($data['type'])) return;

        switch ($data['type']) {

            // ── Client registers their userId after connecting ──────────────
            case 'auth':
                $uid = (int)($data['user_id'] ?? 0);
                if ($uid) {
                    $this->userConnections[$uid] = $from;
                    $from->userData = ['user_id' => $uid];
                    echo "User $uid authenticated on connection {$from->resourceId}\n";

                    // Send unread count on connect
                    $this->sendUnreadCount($from, $uid);
                }
                break;

            // ── Load conversation list for a user ──────────────────────────
            case 'get_conversations':
                $uid = (int)($data['user_id'] ?? 0);
                if (!$uid) break;
                $convs = $this->getConversations($uid);
                $from->send(json_encode([
                    'type'          => 'conversations',
                    'conversations' => $convs,
                ]));
                break;

            // ── Load messages in a conversation ────────────────────────────
            case 'get_messages':
                $convId = (int)($data['conversation_id'] ?? 0);
                $uid    = (int)($data['user_id'] ?? 0);
                if (!$convId || !$uid) break;

                // Mark messages as read
                $this->db->prepare(
                    "UPDATE messages SET is_read=1
                     WHERE conversation_id=? AND sender_id != ?"
                )->execute([$convId, $uid]);

                $msgs = $this->getMessages($convId);
                $from->send(json_encode([
                    'type'            => 'messages',
                    'conversation_id' => $convId,
                    'messages'        => $msgs,
                ]));
                break;

            // ── Open / create a conversation between two users ─────────────
            case 'open_conversation':
                $uid       = (int)($data['user_id'] ?? 0);
                $otherUid  = (int)($data['other_user_id'] ?? 0);
                if (!$uid || !$otherUid || $uid === $otherUid) break;

                $convId = $this->getOrCreateConversation($uid, $otherUid);

                $from->send(json_encode([
                    'type'            => 'conversation_opened',
                    'conversation_id' => $convId,
                ]));
                break;

            // ── Send a message ─────────────────────────────────────────────
            case 'send_message':
                $senderId = (int)($data['sender_id']       ?? 0);
                $convId   = (int)($data['conversation_id'] ?? 0);
                $body     = trim($data['body']             ?? '');

                if (!$senderId || !$convId || $body === '') break;

                // Persist to DB
                $ins = $this->db->prepare(
                    "INSERT INTO messages (conversation_id, sender_id, body) VALUES (?,?,?)"
                );
                $ins->execute([$convId, $senderId, $body]);
                $msgId = (int)$this->db->lastInsertId();

                // Get sender name for display
                $st = $this->db->prepare("SELECT name, avatar FROM users WHERE id=?");
                $st->execute([$senderId]);
                $sender = $st->fetch();

                $payload = json_encode([
                    'type'            => 'new_message',
                    'conversation_id' => $convId,
                    'message'         => [
                        'id'         => $msgId,
                        'sender_id'  => $senderId,
                        'sender'     => $sender['name']   ?? 'Unknown',
                        'avatar'     => $sender['avatar'] ?? '',
                        'body'       => $body,
                        'created_at' => date('Y-m-d H:i:s'),
                        'is_read'    => 0,
                    ],
                ]);

                // Deliver to both participants of the conversation
                $conv = $this->db->prepare(
                    "SELECT user_a, user_b FROM conversations WHERE id=?"
                );
                $conv->execute([$convId]);
                $row = $conv->fetch();
                if (!$row) break;

                foreach ([$row['user_a'], $row['user_b']] as $recipientId) {
                    if (isset($this->userConnections[$recipientId])) {
                        $this->userConnections[$recipientId]->send($payload);
                    }
                }
                break;
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->clients->detach($conn);
        // Remove from userConnections map
        foreach ($this->userConnections as $uid => $c) {
            if ($c === $conn) {
                unset($this->userConnections[$uid]);
                echo "User $uid disconnected.\n";
                break;
            }
        }
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Error: {$e->getMessage()}\n";
        $conn->close();
    }

    // ── HELPERS ───────────────────────────────────────────────────────────────

    private function getOrCreateConversation(int $a, int $b): int
    {
        [$lo, $hi] = $a < $b ? [$a, $b] : [$b, $a];
        $st = $this->db->prepare(
            "SELECT id FROM conversations WHERE user_a=? AND user_b=?"
        );
        $st->execute([$lo, $hi]);
        $row = $st->fetch();
        if ($row) return (int)$row['id'];

        $this->db->prepare(
            "INSERT INTO conversations (user_a, user_b) VALUES (?,?)"
        )->execute([$lo, $hi]);
        return (int)$this->db->lastInsertId();
    }

    private function getConversations(int $uid): array
    {
        $st = $this->db->prepare("
            SELECT
                c.id,
                other.id   AS other_id,
                other.name AS other_name,
                other.avatar AS other_avatar,
                other.role AS other_role,
                (SELECT body FROM messages
                 WHERE conversation_id = c.id
                 ORDER BY id DESC LIMIT 1) AS last_message,
                (SELECT created_at FROM messages
                 WHERE conversation_id = c.id
                 ORDER BY id DESC LIMIT 1) AS last_time,
                (SELECT COUNT(*) FROM messages
                 WHERE conversation_id = c.id
                   AND sender_id != ?
                   AND is_read = 0) AS unread_count
            FROM conversations c
            JOIN users other ON other.id = IF(c.user_a = ?, c.user_b, c.user_a)
            WHERE c.user_a = ? OR c.user_b = ?
            ORDER BY last_time DESC
        ");
        $st->execute([$uid, $uid, $uid, $uid]);
        return $st->fetchAll();
    }

    private function getMessages(int $convId): array
    {
        $st = $this->db->prepare("
            SELECT m.*, u.name AS sender, u.avatar
            FROM messages m
            JOIN users u ON u.id = m.sender_id
            WHERE m.conversation_id = ?
            ORDER BY m.id ASC
        ");
        $st->execute([$convId]);
        return $st->fetchAll();
    }

    private function sendUnreadCount(ConnectionInterface $conn, int $uid): void
    {
        $st = $this->db->prepare("
            SELECT COUNT(*) AS cnt
            FROM messages m
            JOIN conversations c ON c.id = m.conversation_id
            WHERE (c.user_a = ? OR c.user_b = ?)
              AND m.sender_id != ?
              AND m.is_read = 0
        ");
        $st->execute([$uid, $uid, $uid]);
        $row = $st->fetch();
        $conn->send(json_encode([
            'type'  => 'unread_count',
            'count' => (int)($row['cnt'] ?? 0),
        ]));
    }
}

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new CampusGigChat()
        )
    ),
    8080   // WebSocket port
);

echo "Listening on ws://localhost:8080\n";
$server->run();
