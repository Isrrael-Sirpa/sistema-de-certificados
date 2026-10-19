<?php

return [
    'issuer' => 'Universidad Mayor de San Andrés — Facultad de Tecnología',
    'public_url' => env('CERTIFICATES_PUBLIC_URL', env('APP_URL')),
    'node' => env('PDF_NODE_BINARY', 'node'),
    'chrome' => env('PDF_CHROME_BINARY'),
    'demo_allowed' => (bool) env('DEMO_ALLOWED', false),
];
