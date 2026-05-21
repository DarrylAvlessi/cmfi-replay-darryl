<?php
/**
 * og.php — Générateur de balises Open Graph pour CMFI Replay
 * 
 * Ce script est automatiquement appelé par .htaccess quand un crawler
 * de réseau social (WhatsApp, Facebook, Twitter, Telegram, Discord, LinkedIn...)
 * demande une page de contenu (film, série, podcast, épisode).
 * 
 * Fonctionnement :
 * 1. Parse l'URL pour déterminer le type de contenu et l'UID
 * 2. Appelle l'API REST Firestore pour récupérer les données (titre, image, description)
 * 3. Retourne un HTML minimal avec les bonnes balises Open Graph
 * 
 * Les vrais utilisateurs ne voient JAMAIS cette page — ils reçoivent le SPA React.
 */

// ===================================================================
// Configuration Firebase
// ===================================================================
define('FIREBASE_PROJECT_ID', 'c-m-f-i-replay-f-63xui3');
define('FIREBASE_API_KEY', 'AIzaSyBK7nmvzQ1Zmb2iiW2NAvJ-U8b8XloYKto');
define('FIRESTORE_BASE_URL', 'https://firestore.googleapis.com/v1/projects/' . FIREBASE_PROJECT_ID . '/databases/(default)/documents');

// ===================================================================
// Récupération du chemin
// ===================================================================
$path = isset($_GET['path']) ? $_GET['path'] : trim($_SERVER['REQUEST_URI'], '/');
$path = strtok($path, '?'); // Enlever les query strings
$path = trim($path, '/');

// Déterminer le protocole (http ou https)
$protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
$baseUrl = $protocol . '://' . $_SERVER['HTTP_HOST'];

// ===================================================================
// Valeurs par défaut
// ===================================================================
$title = 'CMFI Replay';
$description = 'Plateforme de replay chrétienne — Documentaires, enseignements et podcasts.';
$image = $baseUrl . '/cmfireplay.svg';
$ogType = 'website';
$url = $baseUrl . '/' . $path;

// ===================================================================
// Parser le chemin et récupérer les données
// ===================================================================
$segments = explode('/', $path);
$contentType = isset($segments[0]) ? $segments[0] : '';
$uid = isset($segments[1]) ? $segments[1] : '';

if (!empty($uid)) {
    switch ($contentType) {
        // --- Documentaire ---
        case 'documentary':
        // --- Film ---
        case 'movie':
            $data = queryFirestore('movies', 'uid', $uid);
            if ($data) {
                $title = getField($data, 'title', $title);
                $description = getField($data, 'overview', $description);
                $img = getField($data, 'picture_path', '');
                if (empty($img)) {
                    $img = getField($data, 'backdrop_path', '');
                }
                if (!empty($img)) {
                    $image = $img;
                }
                $ogType = 'video.movie';
            }
            break;

        // --- Enseignement ---
        case 'teaching':
        // --- Série ou Podcast ---
        case 'serie':
        case 'podcast':
            $data = queryFirestore('series', 'uid_serie', $uid);
            if ($data) {
                $title = getField($data, 'title_serie', $title);
                $description = getField($data, 'overview_serie', $description);
                $img = getField($data, 'image_path', '');
                if (empty($img)) {
                    $img = getField($data, 'back_path', '');
                }
                if (!empty($img)) {
                    $image = $img;
                }
                $ogType = 'video.tv_show';
            }
            break;

        // --- Lecture (peut être un film ou un épisode) ---
        case 'watch':
            // Essayer d'abord en tant que film
            $data = queryFirestore('movies', 'uid', $uid);
            if ($data) {
                $title = getField($data, 'title', $title);
                $description = getField($data, 'overview', $description);
                $img = getField($data, 'picture_path', '');
                if (empty($img)) {
                    $img = getField($data, 'backdrop_path', '');
                }
                if (!empty($img)) {
                    $image = $img;
                }
                $ogType = 'video.movie';
            } else {
                // Sinon, essayer en tant qu'épisode
                $data = queryFirestore('episodesSeries', 'uid_episode', $uid);
                if ($data) {
                    $episodeTitle = getField($data, 'title', '');
                    $serieTitle = getField($data, 'title_serie', '');
                    if (!empty($episodeTitle)) {
                        $title = $episodeTitle;
                        if (!empty($serieTitle)) {
                            $title .= ' — ' . $serieTitle;
                        }
                    }
                    $desc = getField($data, 'overview', '');
                    if (empty($desc)) {
                        $desc = getField($data, 'overviewFr', '');
                    }
                    if (!empty($desc)) {
                        $description = $desc;
                    }
                    $img = getField($data, 'picture_path', '');
                    if (empty($img)) {
                        $img = getField($data, 'backdrop_path', '');
                    }
                    if (!empty($img)) {
                        $image = $img;
                    }
                    $ogType = 'video.episode';
                }
            }
            break;
    }
}

// ===================================================================
// Formatage final
// ===================================================================

// Ajouter le suffixe au titre
$fullTitle = ($title !== 'CMFI Replay') ? $title . ' — CMFI Replay' : $title;

// Tronquer la description (max 200 caractères)
if (mb_strlen($description) > 200) {
    $description = mb_substr($description, 0, 197) . '...';
}

// Échapper les caractères HTML
$fullTitle = htmlspecialchars($fullTitle, ENT_QUOTES, 'UTF-8');
$description = htmlspecialchars($description, ENT_QUOTES, 'UTF-8');
$image = htmlspecialchars($image, ENT_QUOTES, 'UTF-8');
$url = htmlspecialchars($url, ENT_QUOTES, 'UTF-8');

// Cache de 1 heure pour les crawlers
header('Cache-Control: public, max-age=3600');
header('Content-Type: text/html; charset=UTF-8');

// ===================================================================
// Fonctions utilitaires
// ===================================================================

/**
 * Effectue une requête structurée sur Firestore via l'API REST
 * 
 * @param string $collectionName Nom de la collection Firestore
 * @param string $field Nom du champ à filtrer
 * @param string $value Valeur attendue du champ
 * @return array|null Les champs du document trouvé, ou null
 */
function queryFirestore($collectionName, $field, $value) {
    $queryUrl = FIRESTORE_BASE_URL . ':runQuery?key=' . FIREBASE_API_KEY;

    $queryBody = [
        'structuredQuery' => [
            'from' => [['collectionId' => $collectionName]],
            'where' => [
                'fieldFilter' => [
                    'field' => ['fieldPath' => $field],
                    'op' => 'EQUAL',
                    'value' => ['stringValue' => $value]
                ]
            ],
            'limit' => 1
        ]
    ];

    $jsonBody = json_encode($queryBody);

    // Essayer avec cURL d'abord (plus fiable)
    if (function_exists('curl_init')) {
        $ch = curl_init($queryUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($jsonBody)
            ],
            CURLOPT_POSTFIELDS => $jsonBody,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode >= 200 && $httpCode < 300 && $response !== false) {
            return parseFirestoreResponse($response);
        }
    }

    // Fallback : file_get_contents
    if (ini_get('allow_url_fopen')) {
        $options = [
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nContent-Length: " . strlen($jsonBody) . "\r\n",
                'content' => $jsonBody,
                'timeout' => 5,
                'ignore_errors' => true
            ]
        ];

        $context = stream_context_create($options);
        $response = @file_get_contents($queryUrl, false, $context);

        if ($response !== false) {
            return parseFirestoreResponse($response);
        }
    }

    return null;
}

/**
 * Parse la réponse JSON de l'API Firestore
 */
function parseFirestoreResponse($response) {
    $result = json_decode($response, true);

    if (is_array($result) && !empty($result) && isset($result[0]['document']['fields'])) {
        return $result[0]['document']['fields'];
    }

    return null;
}

/**
 * Extraire la valeur d'un champ du document Firestore
 * L'API REST Firestore retourne des valeurs typées (stringValue, integerValue, etc.)
 */
function getField($fields, $fieldName, $default = '') {
    if (!isset($fields[$fieldName])) {
        return $default;
    }

    $field = $fields[$fieldName];

    if (isset($field['stringValue'])) {
        $val = $field['stringValue'];
        return !empty($val) ? $val : $default;
    }
    if (isset($field['integerValue'])) {
        return $field['integerValue'];
    }
    if (isset($field['doubleValue'])) {
        return $field['doubleValue'];
    }
    if (isset($field['booleanValue'])) {
        return $field['booleanValue'];
    }

    return $default;
}
?>
<!DOCTYPE html>
<html lang="fr" prefix="og: https://ogp.me/ns#">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $fullTitle; ?></title>

    <!-- Open Graph Meta Tags -->
    <meta property="og:title" content="<?php echo $fullTitle; ?>">
    <meta property="og:description" content="<?php echo $description; ?>">
    <meta property="og:image" content="<?php echo $image; ?>">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="<?php echo $url; ?>">
    <meta property="og:type" content="<?php echo $ogType; ?>">
    <meta property="og:site_name" content="CMFI Replay">

    <!-- Twitter Card Meta Tags -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="<?php echo $fullTitle; ?>">
    <meta name="twitter:description" content="<?php echo $description; ?>">
    <meta name="twitter:image" content="<?php echo $image; ?>">

    <!-- SEO -->
    <meta name="description" content="<?php echo $description; ?>">
    <link rel="canonical" href="<?php echo $url; ?>">
</head>
<body>
    <!--
        Cette page HTML est servie uniquement aux crawlers de réseaux sociaux
        (WhatsApp, Facebook, Twitter, Telegram, Discord, LinkedIn, etc.)
        Les vrais utilisateurs reçoivent l'application React via index.html.
    -->
    <h1><?php echo $fullTitle; ?></h1>
    <p><?php echo $description; ?></p>
    <?php if (!empty($image)): ?>
    <img src="<?php echo $image; ?>" alt="<?php echo $fullTitle; ?>">
    <?php endif; ?>
    <p><a href="<?php echo $url; ?>">Voir sur CMFI Replay</a></p>
</body>
</html>
