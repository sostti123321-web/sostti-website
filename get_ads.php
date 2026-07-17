<?php
/**
 * get_ads.php — Automatically lists images in the ads folder
 */
header('Content-Type: application/json');
header('Cache-Control: no-cache');

// Use absolute path relative to this script so it works from any URL depth
$dir     = __DIR__ . '/images/ads/';
$webPath = 'images/ads/';
$ads     = [];

if (is_dir($dir)) {
    $files = scandir($dir);
    if ($files) {
        foreach ($files as $file) {
            // Only include image files
            if (preg_match('/\.(jpg|jpeg|png|webp|gif)$/i', $file)) {
                $ads[] = $webPath . $file;
            }
        }
    }
}

// Return the list as JSON
echo json_encode(array_values($ads));
?>
