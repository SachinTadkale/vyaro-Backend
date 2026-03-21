# API Payload Samples

Base URL: `http://localhost:5000`

Auth header for protected routes:

```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Auth APIs

### 1. Register User

Endpoint: `POST /api/auth/register`

Request payload:

```json
{
  "name": "Ravi Kumar",
  "phone_no": "9876543210",
  "password": "secret123",
  "address": "Pune",
  "email": "ravi@example.com",
  "gender": "MALE"
}
```

Success response:

```json
{
  "success": true,
  "message": "Registration successful. Continue onboarding.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Error response:

```json
{
  "success": false,
  "message": "Email already registered"
}
```

### 2. Login User

Endpoint: `POST /api/auth/login`

Request payload:

```json
{
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Success response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Common error responses:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

```json
{
  "success": false,
  "message": "Your documents are under review."
}
```

```json
{
  "success": false,
  "message": "Admin accounts must login through the admin login API."
}
```

### 3. Request OTP

Endpoint: `POST /api/auth/requestOtp`

Request payload:

```json
{
  "email": "ravi@example.com"
}
```

Success response:

```json
{
  "success": true,
  "message": "OTP sent to your email."
}
```

### 4. Login With OTP

Endpoint: `POST /api/auth/loginWithOtp`

Request payload:

```json
{
  "email": "ravi@example.com",
  "otp": "123456"
}
```

Success response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Common error response:

```json
{
  "success": false,
  "message": "Admin cannot login using OTP"
}
```

### 5. Forgot Password

Endpoint: `POST /api/auth/forgotPassword`

Request payload:

```json
{
  "email": "ravi@example.com"
}
```

Success response:

```json
{
  "success": true,
  "message": "Password reset OTP sent to email."
}
```

### 6. Reset Password

Endpoint: `POST /api/auth/resetPassword`

Request payload:

```json
{
  "email": "ravi@example.com",
  "otp": "123456",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

Success response:

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## Farm APIs

### 7. Add Farm Details

Endpoint: `POST /api/farm/`

Request payload:

```json
{
  "state": "Maharashtra",
  "district": "Pune",
  "village": "Hadapsar",
  "pincode": "411028",
  "landArea": 2.5
}
```

Success response:

```json
{
  "success": true,
  "message": "Farm details added successfully",
  "data": {
    "id": "farm-id",
    "userId": "user-id",
    "state": "Maharashtra",
    "district": "Pune",
    "village": "Hadapsar",
    "pincode": "411028",
    "landArea": 2.5
  }
}
```

## Bank APIs

### 8. Add Bank Details

Endpoint: `POST /api/bank/`

Request payload:

```json
{
  "accountHolder": "Ravi Kumar",
  "bankName": "State Bank of India",
  "accountNumber": "123456789012",
  "ifsc": "SBIN0001234"
}
```

Success response:

```json
{
  "success": true,
  "message": "Bank details added successfully",
  "data": {
    "id": "bank-id",
    "userId": "user-id",
    "accountHolder": "Ravi Kumar",
    "bankName": "State Bank of India",
    "accountNumber": "123456789012",
    "ifsc": "SBIN0001234"
  }
}
```

## KYC APIs

### 9. Upload KYC

Endpoint: `POST /api/kyc/`

Content type: `multipart/form-data`

Form-data fields:

```text
docType: AADHAR
docNo: 123412341234
frontImage: <file>
backImage: <file>
```

Success response:

```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "data": {
    "kycId": "kyc-id",
    "userId": "user-id",
    "docType": "AADHAR",
    "docNo": "123412341234",
    "frontImage": "https://res.cloudinary.com/demo/front.jpg",
    "backImage": "https://res.cloudinary.com/demo/back.jpg",
    "createdAt": "2026-03-15T10:00:00.000Z"
  }
}
```

### 10. Upload KYC Via User Module

Endpoint: `POST /api/user/upload-kyc`

Content type: `multipart/form-data`

Form-data fields:

```text
docNo: 123412341234
document: <file>
```

Success response:

```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "data": {
    "kycId": "kyc-id",
    "userId": "user-id",
    "docType": "AADHAR",
    "docNo": "123412341234",
    "frontImage": "https://res.cloudinary.com/demo/front.jpg",
    "backImage": null,
    "createdAt": "2026-03-15T10:00:00.000Z"
  }
}
```

### 11. User Dashboard

Endpoint: `GET /api/user/dashboard`

Request payload: none

Success response:

```json
{
  "success": true,
  "message": "Dashboard access granted",
  "user": {
    "userId": "user-id",
    "role": "USER"
  }
}
```

## Company Auth APIs

### 12. Register Company

Endpoint: `POST /api/companyAuth/register`

Request payload:

```json
{
  "companyName": "AgroGrow Pvt Ltd",
  "registrationNo": "COMP-2026-001",
  "hqLocation": "Pune, Maharashtra",
  "gstNumber": "27AABCU9603R1ZX",
  "email": "contact@agrogrow.com",
  "password": "Company@123"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "companyName": "AgroGrow Pvt Ltd",
    "registrationNo": "COMP-2026-001",
    "hqLocation": "Pune, Maharashtra",
    "gstNumber": "27AABCU9603R1ZX",
    "email": "contact@agrogrow.com",
    "password": "$2b$10$hashedpassword",
    "gstCertificateUrl": null,
    "licenseDocUrl": null,
    "verification": "PENDING",
    "createdAt": "2026-03-15T10:00:00.000Z",
    "updatedAt": "2026-03-15T10:00:00.000Z"
  }
}
```

### 13. Upload Company Documents

Endpoint: `POST /api/companyAuth/upload-documents`

Content type: `multipart/form-data`

Form-data fields:

```text
companyId: company-id
gst: <file>
license: <file>
```

Success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "companyName": "AgroGrow Pvt Ltd",
    "registrationNo": "COMP-2026-001",
    "hqLocation": "Pune, Maharashtra",
    "gstNumber": "27AABCU9603R1ZX",
    "email": "contact@agrogrow.com",
    "password": "$2b$10$hashedpassword",
    "gstCertificateUrl": "https://res.cloudinary.com/demo/gst.jpg",
    "licenseDocUrl": "https://res.cloudinary.com/demo/license.jpg",
    "verification": "PENDING",
    "createdAt": "2026-03-15T10:00:00.000Z",
    "updatedAt": "2026-03-15T10:10:00.000Z"
  }
}
```

### 14. Login Company

Endpoint: `POST /api/companyAuth/login`

Request payload:

```json
{
  "registrationNo": "COMP-2026-001",
  "password": "Company@123"
}
```

Success response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

## Admin Auth APIs

### 15. Login Admin

Endpoint: `POST /api/admin-auth/login`

Request payload:

```json
{
  "email": "admin@farmzy.com",
  "password": "Admin@123"
}
```

Success response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

Common error responses:

```json
{
  "success": false,
  "message": "This login is only for admins. Please use the user login API."
}
```

```json
{
  "success": false,
  "message": "Your admin account is blocked."
}
```

### 16. Forgot Password Admin

Endpoint: `POST /api/admin-auth/forgotPassword`

Request payload:

```json
{
  "email": "admin@farmzy.com"
}
```

Success response:

```json
{
  "success": true,
  "message": "Admin password reset OTP sent to email."
}
```

Common error response:

```json
{
  "success": false,
  "message": "This flow is only for admins. Please use the user auth API."
}
```

### 17. Reset Admin Password

Endpoint: `POST /api/admin-auth/resetPassword`

Request payload:

```json
{
  "email": "admin@farmzy.com",
  "otp": "123456",
  "newPassword": "Admin@456",
  "confirmPassword": "Admin@456"
}
```

Success response:

```json
{
  "success": true,
  "message": "Admin password reset successful."
}
```

## Product APIs

### 18. Add Product

Endpoint: `POST /api/product/add-product`

Content type: `multipart/form-data`

Form-data fields:

```text
productName: Tomato
category: Vegetable
unit: 30kg
productImage: <file>
```

Success response:

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "productId": "product-id",
    "productName": "Tomato",
    "category": "Vegetable",
    "unit": "30kg",
    "productImage": "https://res.cloudinary.com/demo/product.jpg",
    "userId": "user-id"
  }
}
```

### 19. Get My Products

Endpoint: `GET /api/product/get-product`

Request payload: none

Success response:

```json
{
  "success": true,
  "data": [
    {
      "productId": "product-id",
      "productName": "Tomato",
      "category": "Vegetable",
      "unit": "30kg",
      "productImage": "https://res.cloudinary.com/demo/product.jpg"
    }
  ]
}
```

### 20. Update Product

Endpoint: `PATCH /api/product/udpate-product/:id`

Content type: `multipart/form-data`

Form-data fields:

```text
productName: Onion
category: Vegetable
unit: 25kg
productImage: <file>
```

Success response:

```json
{
  "success": true,
  "message": "Product updated successfully",
  "data": {
    "productId": "product-id",
    "productName": "Onion",
    "category": "Vegetable",
    "unit": "25kg",
    "productImage": "https://res.cloudinary.com/demo/product-new.jpg"
  }
}
```

### 21. Delete Product

Endpoint: `DELETE /api/product/delete-product/:id`

Request payload: none

Success response:

```json
{
  "success": true,
  "message": "Product deleted successfully"
}
```

## Admin APIs

### 22. Get Pending KYC Users

Endpoint: `GET /api/admin/users/pending-kyc`

Request payload: none

Success response:

```json
{
  "success": true,
  "data": [
    {
      "user_id": "user-id",
      "name": "Ravi Kumar",
      "phone_no": "9876543210",
      "password": "$2b$10$hashedpassword",
      "address": "Pune",
      "email": "ravi@example.com",
      "gender": "MALE",
      "isBlocked": false,
      "role": "USER",
      "verificationStatus": "PENDING",
      "registrationStep": 4,
      "createdAt": "2026-03-15T10:00:00.000Z",
      "updatedAt": "2026-03-15T10:15:00.000Z",
      "kyc": {
        "kycId": "kyc-id",
        "userId": "user-id",
        "docType": "AADHAR",
        "docNo": "123412341234",
        "frontImage": "https://res.cloudinary.com/demo/front.jpg",
        "backImage": "https://res.cloudinary.com/demo/back.jpg",
        "createdAt": "2026-03-15T10:15:00.000Z"
      }
    }
  ]
}
```

### 23. Get Pending Company Verifications

Endpoint: `GET /api/admin/companies/pending-verification`

Request payload: none

Success response:

```json
{
  "success": true,
  "data": [
    {
      "companyId": "company-id",
      "companyName": "AgroGrow Pvt Ltd",
      "registrationNo": "COMP-2026-001",
      "hqLocation": "Pune, Maharashtra",
      "gstNumber": "27AABCU9603R1ZX",
      "email": "contact@agrogrow.com",
      "password": "$2b$10$hashedpassword",
      "gstCertificateUrl": "https://res.cloudinary.com/demo/gst.jpg",
      "licenseDocUrl": "https://res.cloudinary.com/demo/license.jpg",
      "verification": "PENDING",
      "createdAt": "2026-03-15T10:00:00.000Z",
      "updatedAt": "2026-03-15T10:10:00.000Z"
    }
  ]
}
```

### 24. Approve Company

Endpoint: `PATCH /api/admin/companies/:id/approve`

Request payload:

```json
{}
```

Success response:

```json
{
  "success": true,
  "message": "Company approved successfully"
}
```

### 25. Reject Company

Endpoint: `PATCH /api/admin/companies/:id/reject`

Request payload:

```json
{}
```

Success response:

```json
{
  "success": true,
  "message": "Company rejected successfully"
}
```

### 26. Approve User

Endpoint: `PATCH /api/admin/users/:id/approve`

Request payload:

```json
{}
```

Success response:

```json
{
  "success": true,
  "message": "User approved successfully"
}
```

### 27. Reject User

Endpoint: `PATCH /api/admin/users/:id/reject`

Request payload:

```json
{
  "reason": "Document number does not match uploaded proof"
}
```

Success response:

```json
{
  "success": true,
  "message": "User rejected successfully"
}
```

## Common 404

### 28. Route Not Found

Success response:

```json
{
  "success": false,
  "message": "Route Not Found"
}
```
