<?php
/**
 * CampusGig — api.php
 * Place at: C:\xampp\htdocs\campusgig\api.php
 *
 * Handles all REST operations:
 *   login, register, gigs, add_gig, approve_gig, reject_gig, delete_gig,
 *   book, bookings, users, toggle_user, delete_user
 */

// ── CORS & JSON headers ────────────────────────────────────────────────────────
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

// ── DB CONFIG ─────────────────────────────────────────────────────────────────
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'campusgig');

function db(): PDO {
    static $pdo = null;
    if (!$pdo) {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER, DB_PASS,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
             PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
        );
    }
    return $pdo;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function ok($data)  { echo json_encode(['ok' => true,  'data'  => $data]);  exit; }
function err($msg)  { echo json_encode(['ok' => false, 'error' => $msg]);   exit; }

function body(): array {
    $raw = file_get_contents('php://input');
    return $raw ? (json_decode($raw, true) ?? []) : [];
}

// ── Route ─────────────────────────────────────────────────────────────────────
$action = $_GET['action'] ?? (body()['action'] ?? '');

// Auto-setup tables on first run
setupTables();

switch ($action) {

    // ── AUTH ──────────────────────────────────────────────────────────────────
    case 'login': {
        $b = body();
        $email = strtolower(trim($b['email'] ?? ''));
        $pw    = $b['password'] ?? '';
        if (!$email || !$pw) err('Email and password required');

        $st = db()->prepare('SELECT * FROM users WHERE email = ? AND active = 1 LIMIT 1');
        $st->execute([$email]);
        $u = $st->fetch();
        if (!$u || !password_verify($pw, $u['password'])) err('Invalid email or password');

        unset($u['password']);
        ok($u);
    }

    case 'register': {
        $b    = body();
        $name  = trim($b['name']  ?? '');
        $email = strtolower(trim($b['email'] ?? ''));
        $pw    = $b['password'] ?? '';
        $role  = in_array($b['role'] ?? '', ['student','tutor']) ? $b['role'] : 'student';

        if (!$name || !$email || !$pw) err('All fields required');
        if (strlen($pw) < 6)           err('Password must be at least 6 characters');

        $chk = db()->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
        $chk->execute([$email]);
        if ($chk->fetch()) err('Email already registered');

        $hash   = password_hash($pw, PASSWORD_DEFAULT);
        $avatar = 'https://api.dicebear.com/7.x/thumbs/svg?seed=' . urlencode($name);

        $ins = db()->prepare(
            'INSERT INTO users (name, email, password, role, avatar, active) VALUES (?,?,?,?,?,1)'
        );
        $ins->execute([$name, $email, $hash, $role, $avatar]);
        $id = (int)db()->lastInsertId();

        ok(['id'=>$id,'name'=>$name,'email'=>$email,'role'=>$role,'avatar'=>$avatar,'active'=>1]);
    }

    // ── GIGS ──────────────────────────────────────────────────────────────────
    case 'gigs': {
        $all = isset($_GET['all']) && $_GET['all'] == 1;
        if ($all) {
            // Admin: return every gig
            $st = db()->query(
                'SELECT g.*, u.name AS tutor, u.email AS tutor_email, u.avatar
                 FROM gigs g JOIN users u ON g.tutor_id = u.id
                 ORDER BY g.id DESC'
            );
        } else {
            // Public: only approved gigs
            $st = db()->query(
                'SELECT g.*, u.name AS tutor, u.email AS tutor_email, u.avatar
                 FROM gigs g JOIN users u ON g.tutor_id = u.id
                 WHERE g.status = \'approved\'
                 ORDER BY g.rating DESC'
            );
        }
        $rows = $st->fetchAll();
        // Attach placeholder images by category
        $imgs = [
            'Tutoring'      => 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&q=80',
            'Design'        => 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=400&q=80',
            'Programming'   => 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80',
            'Music'         => 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&q=80',
            'Photography'   => 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=400&q=80',
            'Writing'       => 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=400&q=80',
            'Language'      => 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=400&q=80',
            'Fitness'       => 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
        ];
        foreach ($rows as &$r) {
            $r['image'] = $imgs[$r['category']] ?? 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&q=80';
        }
        ok($rows);
    }

    case 'add_gig': {
        $b    = body();
        $title    = trim($b['title']       ?? '');
        $cat      = trim($b['category']    ?? 'Tutoring');
        $price    = floatval($b['price']   ?? 0);
        $desc     = trim($b['description'] ?? '');
        $tutorId  = intval($b['tutor_id']  ?? 0);

        if (!$title || !$tutorId || $price <= 0) err('Title, price and tutor required');

        $ins = db()->prepare(
            'INSERT INTO gigs (tutor_id, title, category, price, description, status, rating, reviews)
             VALUES (?,?,?,?,?,\'pending\',0,0)'
        );
        $ins->execute([$tutorId, $title, $cat, $price, $desc]);
        ok(['id' => (int)db()->lastInsertId()]);
    }

    case 'approve_gig': {
        $id = intval(body()['id'] ?? 0);
        if (!$id) err('ID required');
        db()->prepare('UPDATE gigs SET status=\'approved\' WHERE id=?')->execute([$id]);
        ok(true);
    }

    case 'reject_gig': {
        $id = intval(body()['id'] ?? 0);
        if (!$id) err('ID required');
        db()->prepare('UPDATE gigs SET status=\'rejected\' WHERE id=?')->execute([$id]);
        ok(true);
    }

    case 'delete_gig': {
        $id = intval(body()['id'] ?? 0);
        if (!$id) err('ID required');
        db()->prepare('DELETE FROM gigs WHERE id=?')->execute([$id]);
        ok(true);
    }

    // ── BOOKINGS ──────────────────────────────────────────────────────────────
    case 'book': {
        $b       = body();
        $gigId   = intval($b['gig_id']    ?? 0);
        $studId  = intval($b['student_id'] ?? 0);
        if (!$gigId || !$studId) err('gig_id and student_id required');

        // Prevent duplicate pending booking
        $chk = db()->prepare(
            'SELECT id FROM bookings WHERE gig_id=? AND student_id=? AND status=\'pending\' LIMIT 1'
        );
        $chk->execute([$gigId, $studId]);
        if ($chk->fetch()) err('You already have a pending booking for this service');

        $gig = db()->prepare('SELECT * FROM gigs WHERE id=? LIMIT 1');
        $gig->execute([$gigId]);
        $g = $gig->fetch();
        if (!$g) err('Gig not found');

        $ins = db()->prepare(
            'INSERT INTO bookings (gig_id, student_id, tutor_id, total, status)
             VALUES (?,?,?,?,\'pending\')'
        );
        $ins->execute([$gigId, $studId, $g['tutor_id'], $g['price']]);
        ok(['id' => (int)db()->lastInsertId()]);
    }

    case 'bookings': {
        $userId = intval($_GET['user_id'] ?? 0);
        $role   = $_GET['role'] ?? '';

        if (!$userId) {
            // Admin: all bookings
            $st = db()->query(
                'SELECT b.*,
                        s.name AS student, s.email AS student_email, s.avatar AS student_avatar,
                        t.name AS tutor,   t.email AS tutor_email,
                        g.title AS gig_title, g.category
                 FROM bookings b
                 JOIN users s ON b.student_id = s.id
                 JOIN users t ON b.tutor_id   = t.id
                 JOIN gigs  g ON b.gig_id     = g.id
                 ORDER BY b.created_at DESC'
            );
        } elseif ($role === 'student') {
            $st = db()->prepare(
                'SELECT b.*,
                        s.name AS student, s.email AS student_email, s.avatar AS student_avatar,
                        t.name AS tutor,   t.email AS tutor_email,
                        g.title AS gig_title, g.category
                 FROM bookings b
                 JOIN users s ON b.student_id = s.id
                 JOIN users t ON b.tutor_id   = t.id
                 JOIN gigs  g ON b.gig_id     = g.id
                 WHERE b.student_id = ?
                 ORDER BY b.created_at DESC'
            );
            $st->execute([$userId]);
        } else {
            // tutor
            $st = db()->prepare(
                'SELECT b.*,
                        s.name AS student, s.email AS student_email, s.avatar AS student_avatar,
                        t.name AS tutor,   t.email AS tutor_email,
                        g.title AS gig_title, g.category
                 FROM bookings b
                 JOIN users s ON b.student_id = s.id
                 JOIN users t ON b.tutor_id   = t.id
                 JOIN gigs  g ON b.gig_id     = g.id
                 WHERE b.tutor_id = ?
                 ORDER BY b.created_at DESC'
            );
            $st->execute([$userId]);
        }
        ok($st->fetchAll());
    }

    case 'update_booking': {
        $b      = body();
        $id     = intval($b['id']     ?? 0);
        $status = $b['status'] ?? '';
        $allowed = ['confirmed','declined','cancelled','completed'];
        if (!$id || !in_array($status, $allowed)) err('Invalid request');
        db()->prepare('UPDATE bookings SET status=? WHERE id=?')->execute([$status, $id]);
        ok(true);
    }

    // ── USERS (admin) ─────────────────────────────────────────────────────────
    case 'users': {
        $st = db()->query(
            'SELECT id, name, email, role, avatar, active,
                    (SELECT COUNT(*) FROM gigs WHERE tutor_id=users.id) AS gig_count,
                    (SELECT COUNT(*) FROM bookings WHERE student_id=users.id) AS booking_count
             FROM users ORDER BY id ASC'
        );
        ok($st->fetchAll());
    }

    case 'toggle_user': {
        $id = intval(body()['id'] ?? 0);
        if (!$id) err('ID required');
        $cur = db()->prepare('SELECT active FROM users WHERE id=? LIMIT 1');
        $cur->execute([$id]);
        $u = $cur->fetch();
        if (!$u) err('User not found');
        $newActive = $u['active'] ? 0 : 1;
        db()->prepare('UPDATE users SET active=? WHERE id=?')->execute([$newActive, $id]);
        ok(['status' => $newActive ? 'activated' : 'deactivated']);
    }

    case 'delete_user': {
        $id = intval(body()['id'] ?? 0);
        if (!$id) err('ID required');
        db()->prepare('DELETE FROM users WHERE id=?')->execute([$id]);
        ok(true);
    }

    default:
        err('Unknown action: ' . htmlspecialchars($action));
}

// ── Auto-setup: create tables + seed demo accounts ────────────────────────────
function setupTables(): void {
    $pdo = db();

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS users (
            id       INT AUTO_INCREMENT PRIMARY KEY,
            name     VARCHAR(100) NOT NULL,
            email    VARCHAR(150) NOT NULL UNIQUE,
            password VARCHAR(255) NOT NULL,
            role     ENUM('student','tutor','admin') NOT NULL DEFAULT 'student',
            avatar   VARCHAR(500) DEFAULT '',
            active   TINYINT(1) NOT NULL DEFAULT 1,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS gigs (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            tutor_id    INT NOT NULL,
            title       VARCHAR(200) NOT NULL,
            category    VARCHAR(100) NOT NULL DEFAULT 'Tutoring',
            price       DECIMAL(10,2) NOT NULL DEFAULT 0,
            description TEXT,
            status      ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
            rating      DECIMAL(3,1) NOT NULL DEFAULT 0,
            reviews     INT NOT NULL DEFAULT 0,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tutor_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS bookings (
            id          INT AUTO_INCREMENT PRIMARY KEY,
            gig_id      INT NOT NULL,
            student_id  INT NOT NULL,
            tutor_id    INT NOT NULL,
            total       DECIMAL(10,2) NOT NULL DEFAULT 0,
            status      ENUM('pending','confirmed','declined','cancelled','completed') NOT NULL DEFAULT 'pending',
            session_date DATE,
            session_time TIME,
            created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (gig_id)     REFERENCES gigs(id)  ON DELETE CASCADE,
            FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (tutor_id)   REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB;
    ");

    // Seed demo accounts if not yet present
    $check = $pdo->query("SELECT COUNT(*) AS n FROM users")->fetch();
    if ((int)$check['n'] === 0) {
        $demos = [
            ['Admin User',   'admin@uc.edu.ph',   'demo123', 'admin',   'https://api.dicebear.com/7.x/thumbs/svg?seed=admin'],
            ['Demo Tutor',   'tutor@uc.edu.ph',   'demo123', 'tutor',   'https://api.dicebear.com/7.x/thumbs/svg?seed=tutor'],
            ['Demo Student', 'student@uc.edu.ph', 'demo123', 'student', 'https://api.dicebear.com/7.x/thumbs/svg?seed=student'],
        ];
        $ins = $pdo->prepare(
            'INSERT INTO users (name,email,password,role,avatar) VALUES (?,?,?,?,?)'
        );
        foreach ($demos as $d) {
            $ins->execute([$d[0], $d[1], password_hash($d[2], PASSWORD_DEFAULT), $d[3], $d[4]]);
        }

        // Seed a few sample gigs for the tutor (id=2)
        $gigs = [
            ['Math Tutoring – Algebra & Calculus', 'Tutoring',    150, 'One-on-one math sessions covering algebra, calculus, and statistics. Patient and thorough explanations.', 4.8, 12],
            ['Web Design with Figma',              'Design',      200, 'UI/UX design for school projects or personal sites. Delivered as editable Figma files.', 4.7, 8],
            ['Python Programming Help',            'Programming', 180, 'Debugging, assignments, and concept walkthroughs for Python beginners and intermediates.', 4.9, 15],
            ['Guitar Lessons for Beginners',       'Music',       120, 'Learn chords, strumming patterns, and your first songs. Acoustic or electric.', 4.6, 6],
        ];
        $gig = $pdo->prepare(
            'INSERT INTO gigs (tutor_id,title,category,price,description,status,rating,reviews) VALUES (2,?,?,?,?,\'approved\',?,?)'
        );
        foreach ($gigs as $g) {
            $gig->execute($g);
        }
    }
}