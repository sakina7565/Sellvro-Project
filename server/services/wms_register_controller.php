<?php
/**
 * Sellvro WMS - RegisteredUserController snippet
 * File Path on WMS: app/Http/Controllers/Auth/RegisteredUserController.php
 * Or wherever Laravel registration is handled (e.g. RegisterController.php)
 */

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create()
    {
        return view('auth.register');
    }

    /**
     * Handle an incoming registration request with full Company & Owner details.
     */
    public function store(Request $request)
    {
        $request->validate([
            // Company Details
            'company_name' => ['required', 'string', 'max:255'],
            'company_email' => ['required', 'string', 'email', 'max:255'],
            'company_phone' => ['required', 'string', 'max:50'],
            'company_address' => ['required', 'string', 'max:500'],
            'registration_entity' => ['required', 'string', 'max:100'],
            'registration_no' => ['required', 'string', 'max:100'],

            // Owner Details
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'owner_phone' => ['required', 'string', 'max:50'],
            'owner_address' => ['required', 'string', 'max:500'],

            // Verification Upload
            'id_card' => ['required', 'file', 'mimes:jpg,jpeg,png,webp,pdf', 'max:10240'],

            // Password
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Upload ID Card
        $idCardPath = null;
        if ($request->hasFile('id_card')) {
            $file = $request->file('id_card');
            $fileName = 'id_card_' . time() . '_' . mt_rand(1000, 9999) . '.' . $file->getClientOriginalExtension();
            $destination = public_path('uploads/verification');
            if (!file_exists($destination)) {
                mkdir($destination, 0755, true);
            }
            $file->move($destination, $fileName);
            $idCardPath = '/uploads/verification/' . $fileName;
        }

        // Generate next WMS-PAKXXXX unique code
        $lastCode = DB::table('users')->where('user_unique_name', 'like', 'WMS-PAK%')->orderBy('id', 'desc')->value('user_unique_name');
        $nextNum = 1001;
        if ($lastCode) {
            $num = intval(str_replace('WMS-PAK', '', $lastCode));
            if ($num > 0) $nextNum = $num + 1;
        }
        $userUniqueName = 'WMS-PAK' . $nextNum;

        // 1. Create User
        $user = User::create([
            'name' => $request->name,
            'user_unique_name' => $userUniqueName,
            'email' => strtolower(trim($request->email)),
            'password' => Hash::make($request->password),
            'status' => 'pending',
        ]);

        // 2. Assign Supplier Role (role_id = 2)
        try {
            DB::table('model_has_roles')->insert([
                'role_id' => 2,
                'model_type' => 'App\\Models\\User',
                'model_id' => $user->id,
            ]);
        } catch (\Exception $e) {}

        // 3. Save Extended Business & Owner Details
        DB::table('supplier_business_details')->insert([
            'user_id' => $user->id,
            'business_name' => $request->company_name,
            'business_email' => strtolower(trim($request->company_email)),
            'phone' => $request->company_phone,
            'address' => $request->company_address,
            'registration_entity' => $request->registration_entity,
            'registration_no' => $request->registration_no,
            'owner_name' => $request->name,
            'owner_email' => strtolower(trim($request->email)),
            'owner_phone' => $request->owner_phone,
            'owner_address' => $request->owner_address,
            'id_card_url' => $idCardPath,
            'category_id' => '1',
            'country' => 'Pakistan',
            'city' => '',
            'order_type' => 'B2B Wholesale',
            'approx_number' => '100',
            'monthly_order' => '50',
            'payment_method' => 'Not Selected',
            'is_verified' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        event(new Registered($user));

        Auth::login($user);

        return redirect()->route('dashboard')->with('success', 'Registration submitted successfully! Your account is currently pending admin verification.');
    }
}

