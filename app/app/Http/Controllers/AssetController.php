<?php

namespace App\Http\Controllers;

use App\Models\GraphicAsset;
use App\Services\Access;
use App\Services\Audit;
use App\Services\Context;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class AssetController extends Controller
{
    public function index(Request $r): Response
    {
        return Inertia::render('Assets', [...Context::choices($r->user()), 'assets' => GraphicAsset::visibleTo($r->user())->latest('id')->paginate(24)]);
    }

    public function store(Request $r): RedirectResponse
    {
        $d = $r->validate(['career_id' => 'nullable|exists:careers,id', 'name' => 'required|string|max:255', 'kind' => 'required|in:logo,signature,stamp,background,watermark,image', 'file' => 'required|image|mimes:png,jpg,jpeg,webp|max:10240|dimensions:max_width=12000,max_height=12000']);
        Access::career($r->user(), $d['career_id'] ?? null);
        $f = $r->file('file');
        [$width,$height] = getimagesize($f->getRealPath());
        abort_if($width * $height > 40000000, 422, 'Máximo 40 megapíxeles.');
        $path = $f->store('assets', 'local');
        $asset = GraphicAsset::create(['career_id' => $d['career_id'] ?? null, 'user_id' => $r->user()->id, 'name' => $d['name'], 'kind' => $d['kind'], 'path' => $path, 'mime' => $f->getMimeType(), 'width' => $width, 'height' => $height]);
        Audit::log($r->user(), 'asset.uploaded', $asset);

        return back()->with('success', 'Recurso guardado en la biblioteca privada.');
    }

    public function file(Request $r, GraphicAsset $asset): BinaryFileResponse
    {
        Access::record($r->user(), $asset, true);

        return response()->file(Storage::disk('local')->path($asset->getRawOriginal('path')), ['Content-Type' => $asset->mime, 'Cache-Control' => 'private, max-age=300', 'X-Content-Type-Options' => 'nosniff']);
    }
}
