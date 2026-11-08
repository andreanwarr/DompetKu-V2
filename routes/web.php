<?php

use App\Http\Controllers\CategoryController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ExportController;
use App\Http\Controllers\FundSourceController;
use App\Http\Controllers\LocaleController;
use App\Http\Controllers\PlanningController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\TransactionController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::patch('/locale', [LocaleController::class, 'update'])->name('locale.update');
    Route::get('dashboard', DashboardController::class)->name('dashboard');
    Route::get('transactions', [TransactionController::class, 'index'])->name('transactions.index');
    Route::post('transactions', [TransactionController::class, 'store'])->name('transactions.store');
    Route::put('transactions/{id}', [TransactionController::class, 'update'])->name('transactions.update');
    Route::delete('transactions/{id}', [TransactionController::class, 'destroy'])->name('transactions.destroy');
    Route::post('transfers', [TransactionController::class, 'transfer'])->name('transfers.store');
    Route::resource('fund-sources', FundSourceController::class)->only(['index', 'store', 'update']);
    Route::post('fund-sources/{fundSource}/adjust', [FundSourceController::class, 'adjust'])->name('fund-sources.adjust');
    Route::resource('categories', CategoryController::class)->only(['index', 'store', 'update']);
    Route::get('planning', [PlanningController::class, 'index'])->name('planning.index');
    Route::get('tabungan', [PlanningController::class, 'savings'])->name('savings.index');
    Route::get('kasbon', [PlanningController::class, 'kasbon'])->name('kasbon.index');
    Route::post('savings', [PlanningController::class, 'storeSaving'])->name('savings.store');
    Route::post('savings/{savingGoal}/movements', [PlanningController::class, 'moveSaving'])->name('savings.movements.store');
    Route::post('receivables', [PlanningController::class, 'storeReceivable'])->name('receivables.store');
    Route::post('receivables/{receivable}/payments', [PlanningController::class, 'payReceivable'])->name('receivables.payments.store');
    Route::post('loans', [PlanningController::class, 'storeLoan'])->name('loans.store');
    Route::post('loans/{loan}/payments', [PlanningController::class, 'payLoan'])->name('loans.payments.store');
    Route::get('reports', [ReportController::class, 'index'])->name('reports.index');
    Route::get('exports/finance.xlsx', ExportController::class)->name('exports.finance');
});

require __DIR__.'/settings.php';
