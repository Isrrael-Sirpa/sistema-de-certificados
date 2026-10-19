<?php

namespace App\Http\Middleware;

use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function share(Request $request): array
    {
        $user = $request->routeIs('verify', 'delivery') ? null : $request->user();

        return [...parent::share($request), 'auth' => ['user' => $user ? [...$user->only('id', 'name', 'email', 'role', 'career_id', 'active'), 'career' => $user->career?->only('id', 'name')] : null], 'flash' => ['success' => fn () => $request->session()->get('success')], 'issuer' => config('certificates.issuer')];
    }
}
