<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class RegistrationClosedTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        // routes Fortify dibaca saat boot, jadi env harus diset sebelum aplikasi dibuat
        putenv('REGISTRATION_ENABLED=false');
        parent::setUp();
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        putenv('REGISTRATION_ENABLED');
    }

    public function test_registration_can_be_closed_with_env_flag(): void
    {
        $this->get('/register')->assertNotFound();
        $this->post('/register', ['name' => 'X', 'email' => 'x@example.com', 'password' => 'password', 'password_confirmation' => 'password'])->assertNotFound();
        $this->assertDatabaseCount('users', 0);

        $this->get('/login')->assertInertia(fn (Assert $page) => $page->where('canRegister', false));
    }
}
