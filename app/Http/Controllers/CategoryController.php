<?php

namespace App\Http\Controllers;

use App\Models\Category;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class CategoryController extends Controller
{
    public function index(Request $request): Response
    {
        return Inertia::render('categories/index', [
            'categories' => Category::ownedBy((int) $request->user()->id)->orderBy('type')->orderBy('name')->get(),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $userId = (int) $request->user()->id;
        $data = $request->validate([
            'type' => ['required', Rule::in(['income', 'expense'])],
            'name' => ['required', 'string', 'max:120', Rule::unique('categories')->where(fn ($query) => $query->where('user_id', $userId)->where('type', $request->string('type')->value()))],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'bucket' => ['nullable', Rule::in(['essential', 'lifestyle', 'saving'])],
        ]);
        // kategori pemasukan nggak punya bucket kebutuhan/gaya hidup
        if ($data['type'] === 'income') {
            $data['bucket'] = 'income';
        } elseif (! isset($data['bucket'])) {
            $data['bucket'] = 'lifestyle';
        }
        Category::create([...$data, 'user_id' => $userId]);

        return back()->with('success', __('Kategori berhasil ditambahkan.'));
    }

    public function update(Request $request, Category $category): RedirectResponse
    {
        abort_unless($category->user_id === $request->user()->id, 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            // kategori pemasukan bucket-nya selalu 'income'
            'bucket' => [Rule::requiredIf($category->type === 'expense'), Rule::in(['essential', 'lifestyle', 'saving'])],
            'color' => ['nullable', 'regex:/^#[0-9a-fA-F]{6}$/'],
            'is_archived' => ['sometimes', 'boolean'],
        ]);
        if ($category->type === 'income') {
            $data['bucket'] = 'income';
        }
        $category->update($data);

        return back()->with('success', __('Kategori berhasil diperbarui.'));
    }
}
