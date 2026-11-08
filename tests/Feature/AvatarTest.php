<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AvatarTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_upload_replace_and_remove_avatar(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->image('a.jpg', 200, 200)])->assertRedirect();
        $first = $user->fresh()->avatar_path;
        Storage::disk('public')->assertExists($first);
        $this->assertSame('/storage/'.$first, $user->fresh()->avatar);

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->image('b.png', 200, 200)]);
        Storage::disk('public')->assertMissing($first);

        $this->actingAs($user)->delete('/settings/avatar')->assertRedirect();
        $this->assertNull($user->fresh()->avatar_path);
    }

    public function test_avatar_must_be_a_small_image(): void
    {
        Storage::fake('public');
        $user = User::factory()->create();

        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->create('x.pdf', 10, 'application/pdf')])->assertSessionHasErrors('avatar');
        $this->actingAs($user)->post('/settings/avatar', ['avatar' => UploadedFile::fake()->image('big.jpg')->size(3000)])->assertSessionHasErrors('avatar');
        $this->assertNull($user->fresh()->avatar_path);
    }
}
