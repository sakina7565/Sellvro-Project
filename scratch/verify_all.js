const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // 1. Find a test user (e.g. user@gmail.com)
  const user = await mongoose.connection.collection('users').findOne({ email: 'user@gmail.com' });
  if (!user) {
    console.error('user@gmail.com not found');
    process.exit(1);
  }
  console.log('User found:', user.email, 'Current Balance:', user.walletBalance);

  // 2. Find an active or approved product
  const product = await mongoose.connection.collection('products').findOne({ status: { $in: ['active', 'approved'] } });
  if (!product) {
    console.error('No active/approved product found');
    process.exit(1);
  }
  console.log('Product found:', product.name, 'ID:', product._id.toString(), 'Price:', product.price, 'Qty:', product.quantity);

  // 3. Test HTTP login to get auth token
  const loginRes = await fetch('http://localhost:5001/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'user@gmail.com', password: 'password123' }),
  });
  const loginData = await loginRes.json();
  if (!loginRes.ok || !loginData.token) {
    console.log('Standard login response:', loginData);
  } else {
    console.log('Login successful, token received');
    const token = loginData.token;

    // 4. Test quick credit endpoint
    const creditRes = await fetch('http://localhost:5001/api/wallet/quick-credit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 2500 }),
    });
    const creditData = await creditRes.json();
    console.log('Quick credit response:', creditRes.status, creditData);

    // 5. Test Order Creation via HTTP POST /api/orders
    const orderPayload = {
      productId: product._id.toString(),
      quantity: 1,
      shippingAddress: {
        fullName: 'Test Reseller Customer',
        phone: '03001234567',
        addressLine: 'House 55, Street 9, F-8/2',
        city: 'Islamabad',
        country: 'Pakistan',
        state: 'ICT',
        postalCode: '44000',
      },
      orderLabelRef: `LBL-${Date.now().toString(36).toUpperCase()}`,
      brandLabel: 'Sellvro Test Merchant',
      labelNotes: 'Handle with Care',
    };

    const orderRes = await fetch('http://localhost:5001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(orderPayload),
    });
    const orderData = await orderRes.json();
    console.log('Order creation HTTP status:', orderRes.status);
    console.log('Order creation result:', orderData.message, 'Order #:', orderData.order?.orderNo, 'New Balance:', orderData.walletBalance);

    // 6. Test with a mock / deal ID fallback (e.g. 'deal-1')
    const dealOrderRes = await fetch('http://localhost:5001/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...orderPayload,
        productId: 'deal-1',
      }),
    });
    const dealOrderData = await dealOrderRes.json();
    console.log('Deal-1 fallback order status:', dealOrderRes.status);
    console.log('Deal-1 fallback order message:', dealOrderData.message, 'Order #:', dealOrderData.order?.orderNo);

    // 7. Test missing uploads endpoint to ensure SVG fallback works (HTTP 200, no 404)
    const imgRes = await fetch('http://localhost:5001/uploads/1788637022517-AI_Editor.png');
    console.log('Missing image fallback status (should be 200):', imgRes.status, 'Content-Type:', imgRes.headers.get('content-type'));
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error in test:', err);
  process.exit(1);
});
