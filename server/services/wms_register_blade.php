<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Supplier Registration - Sellvro WMS</title>
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            min-height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            padding: 30px 15px;
        }
        .register-card {
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.25);
            max-width: 820px;
            margin: 0 auto;
            overflow: hidden;
        }
        .header-gradient {
            background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
            padding: 32px 24px;
            text-align: center;
            color: #ffffff;
        }
        .form-section {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 22px;
        }
        .section-badge {
            background: #2563eb;
            color: #ffffff;
            font-size: 11px;
            font-weight: 700;
            border-radius: 6px;
            padding: 3px 8px;
            margin-right: 8px;
        }
        .section-title {
            font-size: 13px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: #1e293b;
            margin-bottom: 0;
        }
        .form-control, .form-select {
            border-radius: 8px;
            border: 1px solid #cbd5e1;
            padding: 9px 13px;
            font-size: 14px;
        }
        .form-control:focus, .form-select:focus {
            border-color: #2563eb;
            box-shadow: 0 0 0 3px rgba(37,99,235,0.15);
        }
        .btn-submit {
            background: #2563eb;
            border: none;
            padding: 12px 24px;
            font-size: 15px;
            font-weight: 700;
            border-radius: 10px;
            color: #ffffff;
            transition: all 0.2s ease;
        }
        .btn-submit:hover {
            background: #1d4ed8;
            color: #ffffff;
        }
    </style>
</head>
<body>

<div class="register-card">
    <div class="header-gradient">
        <h3 class="fw-bold mb-1 text-white">Sellvro WMS Supplier Registration</h3>
        <p class="mb-0 text-white opacity-75 small">Register your company profile for Warehouse Inventory & Fulfillment</p>
    </div>

    <div class="p-4 p-md-5">
        @if ($errors->any())
            <div class="alert alert-danger rounded-3 mb-4">
                <strong class="d-block mb-1">Please correct the following:</strong>
                <ul class="mb-0 small ps-3">
                    @foreach ($errors->all() as $error)
                        <li>{{ $error }}</li>
                    @endforeach
                </ul>
            </div>
        @endif

        <form method="POST" action="{{ url('/register') }}" enctype="multipart/form-data">
            @csrf

            <!-- 1. COMPANY DETAILS -->
            <div class="form-section">
                <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span class="section-badge">1</span>
                    <h6 class="section-title">Company Details</h6>
                </div>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label small fw-semibold text-secondary">Name of Company <span class="text-danger">*</span></label>
                        <input type="text" name="company_name" class="form-control" placeholder="e.g. Apex Industrial Manufacturing Pvt Ltd" value="{{ old('company_name') }}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Email of Company <span class="text-danger">*</span></label>
                        <input type="email" name="company_email" class="form-control" placeholder="official@company.com" value="{{ old('company_email') }}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Official Phone Number <span class="text-danger">*</span></label>
                        <input type="tel" name="company_phone" class="form-control" placeholder="+92 300 1234567" value="{{ old('company_phone') }}" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold text-secondary">Address of Company <span class="text-danger">*</span></label>
                        <input type="text" name="company_address" class="form-control" placeholder="Factory / Industrial Area / Office Address" value="{{ old('company_address') }}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Registration Entity <span class="text-danger">*</span></label>
                        <select name="registration_entity" class="form-select" required>
                            <option value="" disabled selected>Select Entity Type</option>
                            <option value="Sole Proprietorship" {{ old('registration_entity') == 'Sole Proprietorship' ? 'selected' : '' }}>Sole Proprietorship</option>
                            <option value="Private Limited Company (Pvt Ltd)" {{ old('registration_entity') == 'Private Limited Company (Pvt Ltd)' ? 'selected' : '' }}>Private Limited Company (Pvt Ltd)</option>
                            <option value="Public Limited Company (Ltd)" {{ old('registration_entity') == 'Public Limited Company (Ltd)' ? 'selected' : '' }}>Public Limited Company (Ltd)</option>
                            <option value="Limited Liability Company (LLC)" {{ old('registration_entity') == 'Limited Liability Company (LLC)' ? 'selected' : '' }}>Limited Liability Company (LLC)</option>
                            <option value="Partnership / AOP" {{ old('registration_entity') == 'Partnership / AOP' ? 'selected' : '' }}>Partnership / AOP</option>
                            <option value="Other" {{ old('registration_entity') == 'Other' ? 'selected' : '' }}>Other</option>
                        </select>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Registration No <span class="text-danger">*</span></label>
                        <input type="text" name="registration_no" class="form-control" placeholder="e.g. NTN / SECP / Reg #" value="{{ old('registration_no') }}" required>
                    </div>
                </div>
            </div>

            <!-- 2. OWNER DETAILS -->
            <div class="form-section">
                <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span class="section-badge">2</span>
                    <h6 class="section-title">Owner Details</h6>
                </div>
                <div class="row g-3">
                    <div class="col-12">
                        <label class="form-label small fw-semibold text-secondary">Owner Name <span class="text-danger">*</span></label>
                        <input type="text" name="name" class="form-control" placeholder="Full name of owner" value="{{ old('name') }}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Owner Email (Login Email) <span class="text-danger">*</span></label>
                        <input type="email" name="email" class="form-control" placeholder="owner@example.com" value="{{ old('email') }}" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Owner Phone <span class="text-danger">*</span></label>
                        <input type="tel" name="owner_phone" class="form-control" placeholder="+92 321 7654321" value="{{ old('owner_phone') }}" required>
                    </div>
                    <div class="col-12">
                        <label class="form-label small fw-semibold text-secondary">Owner Address <span class="text-danger">*</span></label>
                        <input type="text" name="owner_address" class="form-control" placeholder="Residential or Personal Address of Owner" value="{{ old('owner_address') }}" required>
                    </div>
                </div>
            </div>

            <!-- 3. VERIFICATION UPLOAD -->
            <div class="form-section">
                <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span class="section-badge">3</span>
                    <h6 class="section-title">Upload : ID Card for Verification</h6>
                </div>
                <div>
                    <label class="form-label small fw-semibold text-secondary">Upload ID Card (CNIC / Passport) <span class="text-danger">*</span></label>
                    <p class="text-muted small mb-2">Upload a clear photo or PDF copy of CNIC or Passport (Max 10 MB).</p>
                    <input type="file" name="id_card" class="form-control" accept=".jpg,.jpeg,.png,.webp,.pdf" required>
                </div>
            </div>

            <!-- 4. SECURITY -->
            <div class="form-section">
                <div class="d-flex align-items-center mb-3 pb-2 border-bottom">
                    <span class="section-badge">4</span>
                    <h6 class="section-title">Account Password</h6>
                </div>
                <div class="row g-3">
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Password <span class="text-danger">*</span></label>
                        <input type="password" name="password" class="form-control" placeholder="Min. 8 characters" required>
                    </div>
                    <div class="col-md-6">
                        <label class="form-label small fw-semibold text-secondary">Confirm Password <span class="text-danger">*</span></label>
                        <input type="password" name="password_confirmation" class="form-control" placeholder="Re-enter password" required>
                    </div>
                </div>
            </div>

            <div class="d-grid mt-4">
                <button type="submit" class="btn btn-submit py-2 fw-bold shadow-sm">
                    Register Supplier Account
                </button>
            </div>

            <div class="text-center mt-3 small text-muted">
                Already registered on WMS? <a href="{{ url('/login') }}" class="text-primary fw-semibold text-decoration-none">Sign in here</a>
            </div>
        </form>
    </div>
</div>

</body>
</html>

