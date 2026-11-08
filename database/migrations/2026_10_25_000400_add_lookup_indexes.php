<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Postgres tidak otomatis bikin index untuk foreign key; join/whereHas ke lines & payments butuh ini.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('journal_lines', function (Blueprint $table) {
            $table->index('journal_entry_id');
            $table->index('category_id');
        });
        Schema::table('saving_goals', fn (Blueprint $table) => $table->index('user_id'));
        Schema::table('receivable_payments', fn (Blueprint $table) => $table->index('receivable_id'));
        Schema::table('loan_payments', fn (Blueprint $table) => $table->index('loan_payable_id'));
    }

    public function down(): void
    {
        Schema::table('journal_lines', function (Blueprint $table) {
            $table->dropIndex(['journal_entry_id']);
            $table->dropIndex(['category_id']);
        });
        Schema::table('saving_goals', fn (Blueprint $table) => $table->dropIndex(['user_id']));
        Schema::table('receivable_payments', fn (Blueprint $table) => $table->dropIndex(['receivable_id']));
        Schema::table('loan_payments', fn (Blueprint $table) => $table->dropIndex(['loan_payable_id']));
    }
};
