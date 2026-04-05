# FarmZy API Reference and Testing Guide

Base URL: `http://localhost:5000`

This document is organized module-by-module in alphabetical order. For every API, it covers:

- purpose
- route
- method
- token/access rules
- request headers
- request payload or form-data
- sample success response
- common error cases
- how to test it

## Quick Start

### Standard JSON headers

```http
Authorization: Bearer <TOKEN>
Content-Type: application/json
```

### Standard multipart headers

```http
Authorization: Bearer <TOKEN>
Content-Type: multipart/form-data
```

### Token map

- `ADMIN_TOKEN`: get from `POST /api/admin-auth/login`
  Use for admin APIs, payment release, and delivery override actions.

- `COMPANY_TOKEN`: get from `POST /api/companyAuth/login`
  Use for company order APIs, payment create/verify, and delivery assignment.

- `DELIVERY_PARTNER_TOKEN`: get from `POST /api/auth/login`
  Use a user whose role is `DELIVERY_PARTNER`; this token is for assigned delivery read/update actions.

- `FARMER_TOKEN`: get from `POST /api/auth/login`
  Use for farm, bank, KYC, product, marketplace seller, and farmer order actions.

### Suggested test data setup

Prepare these records before full end-to-end testing:

- one verified farmer user
- one verified company
- one admin user
- one verified delivery partner user with `DeliveryPartner` record and `isAvailable=true`
- one product owned by the farmer
- one active SELL listing

## A. Admin Auth Module

Base path: `/api/admin-auth`

### A.1 Login Admin

- Purpose: authenticate an admin and get `ADMIN_TOKEN`
- Method: `POST`
- Route: `/api/admin-auth/login`
- Access: public

Request body:

```json
{
  "email": "admin@farmzy.com",
  "password": "Admin@123"
}
```

Sample success response:

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

How to test:

1. Create or seed an admin user.
2. Call the login API with valid credentials.
3. Save the returned token as `ADMIN_TOKEN`.

### A.2 Forgot Password Admin

- Purpose: request OTP for admin password reset
- Method: `POST`
- Route: `/api/admin-auth/forgotPassword`
- Access: public

Request body:

```json
{
  "email": "admin@farmzy.com"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Admin password reset OTP sent to email."
}
```

### A.3 Reset Admin Password

- Purpose: reset admin password using OTP
- Method: `POST`
- Route: `/api/admin-auth/resetPassword`
- Access: public

Request body:

```json
{
  "email": "admin@farmzy.com",
  "otp": "123456",
  "newPassword": "Admin@456",
  "confirmPassword": "Admin@456"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Admin password reset successful."
}
```

## B. Admin Module

Base path: `/api/admin`

Use `ADMIN_TOKEN` for every route below.

### B.1 Approve Company

- Purpose: approve company verification so it can operate as a verified company
- Method: `PATCH`
- Route: `/api/admin/companies/:id/approve`
- Access: admin only

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "Company approved successfully"
}
```

How to test:

1. Register a company.
2. Upload its documents.
3. Login as admin.
4. Call this API using the target `companyId`.

### B.2 Approve User

- Purpose: approve user verification/KYC
- Method: `PATCH`
- Route: `/api/admin/users/:id/approve`
- Access: admin only

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "User approved successfully"
}
```

### B.3 Get Pending Companies

- Purpose: list companies awaiting admin review
- Method: `GET`
- Route: `/api/admin/companies/pending-verification`
- Access: admin only

Sample success response:

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
      "verification": "PENDING"
    }
  ]
}
```

### B.4 Get Pending Users

- Purpose: list users whose KYC is pending
- Method: `GET`
- Route: `/api/admin/users/pending-kyc`
- Access: admin only

Sample success response:

```json
{
  "success": true,
  "data": [
    {
      "user_id": "user-id",
      "name": "Ravi Kumar",
      "email": "ravi@example.com",
      "verificationStatus": "PENDING",
      "kyc": {
        "kycId": "kyc-id",
        "docType": "AADHAR",
        "docNo": "123412341234"
      }
    }
  ]
}
```

### B.5 Reject Company

- Purpose: reject company verification
- Method: `PATCH`
- Route: `/api/admin/companies/:id/reject`
- Access: admin only

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "Company rejected successfully"
}
```

### B.6 Reject User

- Purpose: reject user KYC
- Method: `PATCH`
- Route: `/api/admin/users/:id/reject`
- Access: admin only

Request body:

```json
{
  "reason": "Document number does not match uploaded proof"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "User rejected successfully"
}
```

## C. Auth Module

Base path: `/api/auth`

### C.1 Forgot Password

- Purpose: request OTP for user password reset
- Method: `POST`
- Route: `/api/auth/forgotPassword`
- Access: public

Request body:

```json
{
  "email": "ravi@example.com"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Password reset OTP sent to email."
}
```

### C.2 Login User

- Purpose: authenticate a user and get `FARMER_TOKEN` or `DELIVERY_PARTNER_TOKEN`
- Method: `POST`
- Route: `/api/auth/login`
- Access: public

Request body:

```json
{
  "email": "ravi@example.com",
  "password": "secret123"
}
```

Sample success response:

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

How to test:

1. Register a user.
2. Use correct credentials.
3. Save the JWT.
4. For delivery partner testing, use a user whose DB role is `DELIVERY_PARTNER`.

### C.3 Login With OTP

- Purpose: login user using OTP
- Method: `POST`
- Route: `/api/auth/loginWithOtp`
- Access: public

Request body:

```json
{
  "email": "ravi@example.com",
  "otp": "123456"
}
```

Sample success response:

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### C.4 Register User

- Purpose: create a normal user/farmer account
- Method: `POST`
- Route: `/api/auth/register`
- Access: public

Request body:

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

Sample success response:

```json
{
  "success": true,
  "message": "Registration successful. Continue onboarding.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### C.5 Request OTP

- Purpose: request login OTP for user
- Method: `POST`
- Route: `/api/auth/requestOtp`
- Access: public

Request body:

```json
{
  "email": "ravi@example.com"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "OTP sent to your email."
}
```

### C.6 Reset Password

- Purpose: reset user password using OTP
- Method: `POST`
- Route: `/api/auth/resetPassword`
- Access: public

Request body:

```json
{
  "email": "ravi@example.com",
  "otp": "123456",
  "newPassword": "NewPassword@123",
  "confirmPassword": "NewPassword@123"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Password reset successful"
}
```

## D. Bank Module

Base path: `/api/bank`

### D.1 Add Bank Details

- Purpose: save farmer bank details for future payment release
- Method: `POST`
- Route: `/api/bank/`
- Access: authenticated user
- Recommended token: `FARMER_TOKEN`

Request body:

```json
{
  "accountHolder": "Ravi Kumar",
  "bankName": "State Bank of India",
  "accountNumber": "123456789012",
  "ifsc": "SBIN0001234"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Bank details added successfully",
  "data": {
    "id": "bank-id",
    "accountHolder": "Ravi Kumar",
    "bankName": "State Bank of India",
    "accountNumber": "**** **** 9012",
    "ifsc": "XXXXXXX1234"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "BANK_DETAILS_ALREADY_EXISTS",
  "message": "Bank details already added"
}
```

Testing notes:

- full account number is never returned
- full IFSC is never returned
- bank details are required before payment release to the farmer

## E. Company Auth Module

Base path: `/api/companyAuth`

### E.1 Login Company

- Purpose: authenticate company and get `COMPANY_TOKEN`
- Method: `POST`
- Route: `/api/companyAuth/login`
- Access: public

Request body:

```json
{
  "registrationNo": "COMP-2026-001",
  "password": "Company@123"
}
```

Sample success response:

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### E.2 Logout Company

- Purpose: logout company session
- Method: `POST`
- Route: `/api/companyAuth/logout`
- Access: route exists publicly in current code

### E.3 Register Company

- Purpose: create company account
- Method: `POST`
- Route: `/api/companyAuth/register`
- Access: public

Request body:

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

Sample success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "companyName": "AgroGrow Pvt Ltd",
    "verification": "PENDING"
  }
}
```

### E.4 Upload Company Documents

- Purpose: upload GST and license docs for verification
- Method: `POST`
- Route: `/api/companyAuth/upload-documents`
- Access: public in current route setup
- Content-Type: `multipart/form-data`

Form-data:

```text
companyId: company-id
gst: <file>
license: <file>
```

Sample success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "gstCertificateUrl": "https://res.cloudinary.com/demo/gst.jpg",
    "licenseDocUrl": "https://res.cloudinary.com/demo/license.jpg",
    "verification": "PENDING"
  }
}
```

How to test:

1. Register company.
2. Copy `companyId`.
3. Upload both documents.
4. Then approve from admin module.

## F. Company Profile Module

Base path: `/api/companyProfile`

Use `COMPANY_TOKEN`.

### F.1 Delete Profile Image

- Purpose: remove company profile image
- Method: `DELETE`
- Route: `/api/companyProfile/profile-image`
- Access: authenticated company

Sample success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "profileImageUrl": null
  }
}
```

### F.2 Get Company Profile

- Purpose: fetch current company profile
- Method: `GET`
- Route: `/api/companyProfile/`
- Access: authenticated company

Sample success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "companyName": "AgroGrow Pvt Ltd",
    "email": "contact@agrogrow.com",
    "hqLocation": "Pune, Maharashtra",
    "profileImageUrl": null
  }
}
```

### F.3 Upload Profile Image

- Purpose: upload or update company profile image
- Method: `PUT`
- Route: `/api/companyProfile/profile-image`
- Access: authenticated company
- Content-Type: `multipart/form-data`

Form-data:

```text
image: <file>
```

Sample success response:

```json
{
  "success": true,
  "data": {
    "companyId": "company-id",
    "profileImageUrl": "https://res.cloudinary.com/demo/company-profile.jpg"
  }
}
```

## G. Delivery Module

Base path: `/api/delivery`

Delivery FSM:

```text
ASSIGNED -> PICKED_UP -> IN_TRANSIT -> DELIVERED
```

Failure states:

```text
FAILED
CANCELLED
```

### G.1 Assign Delivery

- Purpose: assign a delivery partner after payment is completed
- Method: `POST`
- Route: `/api/delivery/assign`
- Access: `COMPANY_TOKEN` or `ADMIN_TOKEN`
- Rate limit: `10/min`

Headers:

```http
Authorization: Bearer <COMPANY_TOKEN>
Content-Type: application/json
X-Idempotency-Key: delivery-assign-001
```

Request body:

```json
{
  "orderId": "order-id",
  "deliveryPartnerId": "delivery-partner-id",
  "idempotencyKey": "delivery-assign-001"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Delivery assigned successfully",
  "data": {
    "id": "delivery-id",
    "orderId": "order-id",
    "partnerId": "delivery-partner-id",
    "status": "ASSIGNED"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "ORDER_NOT_FOUND",
  "message": "Order not found"
}
```

```json
{
  "success": false,
  "code": "ORDER_NOT_PAID",
  "message": "Order payment is not completed"
}
```

```json
{
  "success": false,
  "code": "DELIVERY_ALREADY_EXISTS",
  "message": "Delivery already exists for this order"
}
```

```json
{
  "success": false,
  "code": "INVALID_PARTNER",
  "message": "Invalid delivery partner"
}
```

How to test:

1. Create and accept an order.
2. Verify payment first.
3. Use a verified available delivery partner.
4. Call assign API with `COMPANY_TOKEN`.
5. Confirm partner becomes unavailable.

### G.2 Auto Assign Delivery

- Purpose: assign the next available delivery partner automatically
- Method: `POST`
- Route: `/api/delivery/auto-assign`
- Access: `COMPANY_TOKEN` or `ADMIN_TOKEN`
- Rate limit: `10/min`

Request body:

```json
{
  "orderId": "order-id"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Delivery auto-assigned successfully",
  "data": {
    "id": "delivery-id",
    "orderId": "order-id",
    "status": "ASSIGNED"
  }
}
```

### G.3 Get Delivery

- Purpose: fetch delivery with order summary and partner details
- Method: `GET`
- Route: `/api/delivery/:id`
- Access:
  - `COMPANY_TOKEN` for owning company
  - `DELIVERY_PARTNER_TOKEN` for assigned partner
  - `ADMIN_TOKEN`
- Rate limit: `120/min`

Sample success response:

```json
{
  "success": true,
  "data": {
    "id": "delivery-id",
    "orderId": "order-id",
    "status": "ASSIGNED",
    "order": {
      "id": "order-id",
      "orderStatus": "PROCESSING",
      "paymentStatus": "HELD"
    },
    "partner": {
      "id": "delivery-partner-id",
      "name": "Mohan Patil",
      "phone": "9999999999"
    }
  }
}
```

How to test:

1. Call with `COMPANY_TOKEN` for same order company.
2. Call with assigned partner token.
3. Call with unrelated partner token and confirm access denied.

### G.4 Update Delivery Status

- Purpose: update status of a delivery
- Method: `PATCH`
- Route: `/api/delivery/:id/status`
- Access:
  - primary: `DELIVERY_PARTNER_TOKEN`
  - override: `COMPANY_TOKEN`
  - override: `ADMIN_TOKEN`
- Rate limit: `30/min`

Partner flow request bodies:

```json
{
  "status": "PICKED_UP"
}
```

```json
{
  "status": "IN_TRANSIT"
}
```

```json
{
  "status": "DELIVERED"
}
```

Override request bodies:

```json
{
  "status": "FAILED"
}
```

```json
{
  "status": "CANCELLED"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Delivery status updated successfully",
  "data": {
    "deliveryId": "delivery-id",
    "status": "IN_TRANSIT"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "INVALID_STATUS_TRANSITION",
  "message": "Invalid delivery status transition"
}
```

```json
{
  "success": false,
  "code": "UNAUTHORIZED",
  "message": "Unauthorized"
}
```

Testing checklist:

- assigned partner can move `ASSIGNED -> PICKED_UP`
- partner cannot skip to `DELIVERED`
- partner cannot update someone else�s delivery
- company/admin can set `FAILED` or `CANCELLED`
- after `DELIVERED`, further transitions must fail

## H. Farm Module

Base path: `/api/farm`

### H.1 Add Farm Details

- Purpose: save farmer land and location details
- Method: `POST`
- Route: `/api/farm/`
- Access: authenticated user
- Recommended token: `FARMER_TOKEN`

Request body:

```json
{
  "state": "Maharashtra",
  "district": "Pune",
  "village": "Hadapsar",
  "pincode": "411028",
  "landArea": 2.5
}
```

Sample success response:

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

## I. KYC Module

Base path: `/api/kyc`

### I.1 Upload KYC

- Purpose: upload user KYC documents
- Method: `POST`
- Route: `/api/kyc/`
- Access: authenticated user
- Recommended token: `FARMER_TOKEN`
- Content-Type: `multipart/form-data`

Form-data:

```text
docType: AADHAR
docNo: 123412341234
frontImage: <file>
backImage: <file>
```

Sample success response:

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
    "backImage": "https://res.cloudinary.com/demo/back.jpg"
  }
}
```

How to test:

1. Login user.
2. Upload the two images.
3. Approve from admin module before testing verified-only flows.

## J. Leads Module

Base path: `/api/leads`

### J.1 Add Lead

- Purpose: create a marketing lead
- Method: `POST`
- Route: `/api/leads/addLead`
- Access: public

Request body:

```json
{
  "email": "lead@example.com",
  "role": "COMPANY",
  "name": "Demo Lead"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Lead created successfully",
  "data": {
    "id": "lead-id",
    "email": "lead@example.com",
    "role": "COMPANY",
    "name": "Demo Lead"
  }
}
```

### J.2 Delete Lead

- Purpose: delete lead by id
- Method: `DELETE`
- Route: `/api/leads/deleteLead/:id`
- Access: public in current route setup

Sample success response:

```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

### J.3 Get Lead By Id

- Purpose: fetch one lead
- Method: `GET`
- Route: `/api/leads/getLeadById/:id`
- Access: public

### J.4 Get Leads

- Purpose: fetch all leads
- Method: `GET`
- Route: `/api/leads/getLeads`
- Access: public

## K. Marketplace Module

Base path: `/api/marketplace`

Use `FARMER_TOKEN` for seller actions and `COMPANY_TOKEN` or `FARMER_TOKEN` for read actions.

### K.1 Add Listing

- Purpose: create a SELL listing for a farmer-owned product
- Method: `POST`
- Route: `/api/marketplace/addListing`
- Access: verified user only

Request body:

```json
{
  "productId": "2616f048-20cf-4d8e-ab59-0c1af8c422d7",
  "price": 1850,
  "quantity": 120,
  "listingType": "SELL"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Listing created successfully",
  "data": {
    "id": "listing-id",
    "product": {
      "id": "product-id",
      "name": "Tomato",
      "category": "Vegetable",
      "unit": "kg"
    },
    "price": 1850,
    "quantity": 120,
    "listingType": "SELL",
    "status": "ACTIVE"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "message": "Seller must be verified to create listings"
}
```

```json
{
  "success": false,
  "message": "Product not found"
}
```

### K.2 Delete Listing

- Purpose: cancel a farmer-owned listing
- Method: `DELETE`
- Route: `/api/marketplace/deleteListing/:id`
- Access: farmer owner only

Sample success response:

```json
{
  "success": true,
  "message": "Listing cancelled successfully"
}
```

### K.3 Get Listing By Id

- Purpose: fetch one listing before order placement
- Method: `GET`
- Route: `/api/marketplace/getListingById/:id`
- Access: authenticated actor

### K.4 Get Listings

- Purpose: browse marketplace listings
- Method: `GET`
- Route: `/api/marketplace/getListings`
- Access: authenticated actor

Supported query params:

```text
search, productId, category, location, minPrice, maxPrice, minQuantity, maxQuantity, sortBy, order, page, limit
```

Example request:

```http
GET /api/marketplace/getListings?search=tom&category=Vegetable&minPrice=1000&maxPrice=2000&sortBy=price&order=asc&page=1&limit=10
```

### K.5 Get My Listings

- Purpose: fetch listings owned by current farmer
- Method: `GET`
- Route: `/api/marketplace/my-listings`
- Access: farmer only

### K.6 Update Listing

- Purpose: update listing owned by the current farmer
- Method: `PATCH`
- Route: `/api/marketplace/updateListing/:id`
- Access: farmer owner only

Request body:

```json
{
  "price": 1900,
  "quantity": 100,
  "status": "CLOSED"
}
```

Note:

- the current code route is `updateListing`, singular

## L. Order Module

Base path: `/api/orders`

### L.1 Accept Order

- Purpose: farmer accepts an order created by a company
- Method: `PATCH`
- Route: `/api/orders/farmer/:id/accept`
- Access: verified farmer only
- Rate limit: `30/min`

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "Order accepted successfully",
  "data": {
    "id": "order-id",
    "orderStatus": "ACCEPTED",
    "paymentStatus": "INITIATED",
    "farmerAccepted": true
  }
}
```

### L.2 Cancel Order

- Purpose: company cancels its order
- Method: `PATCH`
- Route: `/api/orders/company/:id/cancel`
- Access: company only
- Rate limit: `20/min`

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "Order cancelled successfully",
  "data": {
    "id": "order-id",
    "orderStatus": "CANCELLED"
  }
}
```

### L.3 Create Order

- Purpose: company creates order from a farmer listing
- Method: `POST`
- Route: `/api/orders/company/createOrder`
- Access: verified company only
- Rate limit: `20/min`

Request body:

```json
{
  "listingId": "listing-id",
  "quantity": 25
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Order created successfully",
  "data": {
    "id": "order-id",
    "listingId": "listing-id",
    "orderStatus": "CREATED",
    "paymentStatus": "INITIATED"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "LISTING_NOT_FOUND",
  "message": "Listing not found"
}
```

```json
{
  "success": false,
  "code": "QUANTITY_OVERFLOW",
  "message": "Requested quantity is no longer available"
}
```

Testing notes:

- backend calculates final price
- listing stock is reserved atomically
- use company token only

### L.4 Get Company Order By Id

- Purpose: fetch one company-owned order
- Method: `GET`
- Route: `/api/orders/company/getCompanyOrderById/:id`
- Access: company only

### L.5 Get Company Orders

- Purpose: list orders for the logged-in company
- Method: `GET`
- Route: `/api/orders/company/getCompanyorders`
- Access: company only

Query params:

```text
page, limit, status, sortBy, order
```

Note:

- the route in code is `getCompanyorders` with lowercase `o`

### L.6 Reject Order

- Purpose: farmer rejects a company order
- Method: `PATCH`
- Route: `/api/orders/farmer/:id/reject`
- Access: verified farmer only
- Rate limit: `30/min`

Request body:

```json
{}
```

Sample success response:

```json
{
  "success": true,
  "message": "Order rejected successfully",
  "data": {
    "id": "order-id",
    "orderStatus": "REJECTED"
  }
}
```

## M. Payment Module

Base path: `/api/payments`

### M.1 Create Payment Order

- Purpose: create or reuse a Razorpay order for company payment
- Method: `POST`
- Route: `/api/payments/create-order`
- Access: company only
- Token: `COMPANY_TOKEN`
- Rate limit: `10/min`

Headers:

```http
Authorization: Bearer <COMPANY_TOKEN>
Content-Type: application/json
X-Idempotency-Key: pay-order-001
```

Request body:

```json
{
  "orderId": "order-id",
  "idempotencyKey": "pay-order-001"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Payment order created successfully",
  "data": {
    "paymentId": "payment-id",
    "orderId": "order-id",
    "razorpayOrderId": "order_Rzp123456789",
    "amount": 46250,
    "amountInPaise": 4625000,
    "currency": "INR",
    "keyId": "rzp_test_123456789",
    "status": "INITIATED",
    "receipt": "farmzy_orderid123",
    "isExistingOrder": false
  }
}
```

What to verify:

- payment record is created or reused
- order belongs to the company
- response includes Razorpay order id and key id

### M.2 Get Payment Details

- Purpose: fetch payment information
- Method: `GET`
- Route: `/api/payments/:orderId`
- Access:
  - `COMPANY_TOKEN` for owner company
  - `FARMER_TOKEN` for farmer owner
  - `ADMIN_TOKEN` for admin

### M.3 Release Payment

- Purpose: admin releases held payment after delivery success
- Method: `POST`
- Route: `/api/payments/release/:orderId`
- Access: admin only
- Token: `ADMIN_TOKEN`

Request body:

```json
{
  "releaseReference": "manual_release_20260405_001",
  "notes": {
    "approvedBy": "admin@farmzy.com",
    "deliveryProof": "delivery completed"
  }
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Payment released successfully",
  "data": {
    "paymentId": "payment-id",
    "orderId": "order-id",
    "paymentStatus": "RELEASED",
    "orderStatus": "COMPLETED"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "ORDER_NOT_DELIVERED",
  "message": "Payment can be released only after delivery succeeds"
}
```

```json
{
  "success": false,
  "code": "BANK_DETAILS_NOT_FOUND",
  "message": "Farmer bank details are required before release"
}
```

### M.4 Verify Payment

- Purpose: verify Razorpay payment and move payment into HELD state
- Method: `POST`
- Route: `/api/payments/verify`
- Access: company only
- Token: `COMPANY_TOKEN`
- Rate limit: `15/min`

Request body:

```json
{
  "orderId": "order-id",
  "razorpayOrderId": "order_Rzp123456789",
  "razorpayPaymentId": "pay_Rzp123456789",
  "razorpaySignature": "generated_signature_from_checkout",
  "method": "upi"
}
```

Sample success response:

```json
{
  "success": true,
  "message": "Payment verified successfully",
  "data": {
    "paymentId": "payment-id",
    "orderId": "order-id",
    "orderStatus": "CONFIRMED",
    "paymentStatus": "HELD",
    "razorpayPaymentId": "pay_Rzp123456789"
  }
}
```

Common error responses:

```json
{
  "success": false,
  "code": "INVALID_PAYMENT_SIGNATURE",
  "message": "Invalid payment signature"
}
```

### M.5 Webhook: Razorpay

- Purpose: retry-safe webhook processing for payment captured/failed events
- Method: `POST`
- Route: `/api/webhooks/razorpay`
- Access: Razorpay only

Headers:

```http
X-Razorpay-Signature: <webhook_signature>
X-Razorpay-Event-Id: <unique_event_id>
Content-Type: application/json
```

Supported events:

```text
payment.captured
order.paid
payment.failed
```

## N. Product Module

Base path: `/api/product`

### N.1 Add Product

- Purpose: create farmer-owned product
- Method: `POST`
- Route: `/api/product/add-product`
- Access: verified user
- Token: `FARMER_TOKEN`
- Content-Type: `multipart/form-data`

Form-data:

```text
productName: Tomato
category: Vegetable
unit: 30kg
productImage: <file>
```

Sample success response:

```json
{
  "success": true,
  "message": "Product created successfully",
  "data": {
    "productId": "product-id",
    "productName": "Tomato",
    "category": "Vegetable",
    "unit": "30kg",
    "productImage": "https://res.cloudinary.com/demo/product.jpg"
  }
}
```

### N.2 Delete Product

- Purpose: delete product owned by the current user
- Method: `DELETE`
- Route: `/api/product/delete-product/:id`
- Access: authenticated user
- Token: `FARMER_TOKEN`

### N.3 Get My Products

- Purpose: list products owned by current user
- Method: `GET`
- Route: `/api/product/get-product`
- Access: verified user
- Token: `FARMER_TOKEN`

### N.4 Update Product

- Purpose: update product details
- Method: `PATCH`
- Route: `/api/product/udpate-product/:id`
- Access: authenticated user
- Token: `FARMER_TOKEN`
- Content-Type: `multipart/form-data`

Form-data:

```text
productName: Onion
category: Vegetable
unit: 25kg
productImage: <file>
```

Note:

- current code path is `udpate-product` with typo

## O. User Module

Base path: `/api/user`

Use `FARMER_TOKEN`.

### O.1 Dashboard

- Purpose: check authenticated verified user dashboard access
- Method: `GET`
- Route: `/api/user/dashboard`
- Access: verified authenticated user

Sample success response:

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

### O.2 Upload KYC via User Module

- Purpose: alternate KYC upload endpoint
- Method: `POST`
- Route: `/api/user/upload-kyc`
- Access: authenticated user
- Content-Type: `multipart/form-data`

Form-data:

```text
docNo: 123412341234
document: <file>
```

Sample success response:

```json
{
  "success": true,
  "message": "KYC submitted successfully",
  "data": {
    "kycId": "kyc-id",
    "docType": "AADHAR",
    "docNo": "123412341234"
  }
}
```

## End-to-End Test Flow

### 1. Farmer setup

1. Register user
2. Login user and save `FARMER_TOKEN`
3. Add farm details
4. Add bank details
5. Upload KYC
6. Get admin approval
7. Add product
8. Create listing

### 2. Company setup

1. Register company
2. Upload company documents
3. Get admin approval
4. Login company and save `COMPANY_TOKEN`

### 3. Order flow

1. Company creates order
2. Farmer accepts order

### 4. Payment flow

1. Company creates payment order
2. Complete Razorpay checkout
3. Company verifies payment
4. Confirm payment is `HELD`

### 5. Delivery flow

1. Company assigns delivery or auto-assigns
2. Login delivery partner and save `DELIVERY_PARTNER_TOKEN`
3. Update `PICKED_UP`
4. Update `IN_TRANSIT`
5. Update `DELIVERED`

### 6. Payment release flow

1. Login admin and save `ADMIN_TOKEN`
2. Release payment
3. Confirm payment becomes `RELEASED`
4. Confirm order becomes `COMPLETED`

## Negative Test Checklist

### Auth

- wrong password
- unapproved account login
- OTP mismatch

### Orders

- order with invalid listing id
- order with insufficient quantity
- accept same order twice
- cancel already progressed order

### Payments

- verify with invalid signature
- create payment on cancelled order
- release before delivery
- release without bank details

### Delivery

- assign before payment completion
- assign unavailable partner
- duplicate active assignment
- wrong partner status update
- skip FSM state
- update after delivered

## Common Operational Notes

- order price is always derived by backend
- one order can have only one delivery row
- payment is logical escrow, not third-party escrow
- delivery assignment happens after payment completion
- delivery partner can only update assigned deliveries
- several route names contain spelling inconsistencies; this document follows current code paths

## Payment Environment Variables

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
RAZORPAY_API_BASE_URL=https://api.razorpay.com
RAZORPAY_RELEASE_MODE=MANUAL
```


