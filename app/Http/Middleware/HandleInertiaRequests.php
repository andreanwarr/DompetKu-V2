<?php

namespace App\Http\Middleware;

use App\Models\Category;
use App\Models\FundSource;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Middleware;
use Laravel\Fortify\Features;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $locale = in_array($request->user()?->locale, ['id', 'en'], true)
            ? $request->user()->locale
            : config('app.locale');

        app()->setLocale($locale);

        // pesan sukses dari redirect()->with('success') jadi toast sekali tampil (tidak tersimpan di history)
        if ($request->hasSession() && is_string($message = $request->session()->get('success'))) {
            Inertia::flash('toast', ['type' => 'success', 'message' => $message]);
        }

        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
            ],
            'locale' => $locale,
            'canRegister' => Features::enabled(Features::registration()),
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            // pilihan untuk sheet "Catat" global; closure = cuma dihitung saat dibutuhkan, dilewati di partial reload
            'quickEntry' => fn () => $request->user() ? [
                'fundSources' => FundSource::ownedBy($request->user()->id)->where('is_active', true)->orderBy('name')->get(['id', 'name', 'type', 'color']),
                'categories' => Category::ownedBy($request->user()->id)->where('is_archived', false)->orderBy('name')->get(['id', 'name', 'type', 'color', 'bucket']),
            ] : null,
        ];
    }
}
