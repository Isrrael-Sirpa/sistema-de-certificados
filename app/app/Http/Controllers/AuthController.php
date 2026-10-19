<?php

namespace App\Http\Controllers;

use App\Services\Audit;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function create(): Response
    {
        return Inertia::render('Login');
    }

    public function store(Request $r): RedirectResponse
    {
        $d = $r->validate(['email' => 'required|email', 'password' => 'required|string']);
        $key = mb_strtolower($d['email']).'|'.$r->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages(['email' => 'Demasiados intentos. Espere un minuto.']);
        }
        if (! Auth::attempt([...$d, 'active' => true])) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages(['email' => 'Credenciales incorrectas o cuenta desactivada.']);
        }
        RateLimiter::clear($key);
        $r->session()->regenerate();
        Audit::log($r->user(), 'auth.login');

        return redirect()->intended(route('dashboard'));
    }

    public function destroy(Request $r): RedirectResponse
    {
        Audit::log($r->user(), 'auth.logout');
        Auth::logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();

        return redirect()->route('login');
    }
}
