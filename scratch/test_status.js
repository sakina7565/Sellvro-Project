const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function test() {
  await mongoose.connect(process.env.MONGODB_URI);
  const product = await mongoose.connection.collection('products').findOne({});
  const ownerSupplier = await mongoose.connection.collection('users').findOne({ _id: product.supplier });
  
  const token = jwt.sign(
    { id: ownerSupplier._id, email: ownerSupplier.email, role: 'supplier' },
    process.env.JWT_SECRET || 'sellvro_secret_key_2026',
    { expiresIn: '1h' }
  );

  console.log('Testing with product:', product.name, 'owner:', ownerSupplier.email, 'current status:', product.status);

  // Deactivate
  const deactRes = await fetch('http://localhost:5001/api/products/' + product._id + '/deactivate', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token }
  });
  const deactData = await deactRes.json();
  console.log('Deactivate status:', deactRes.status, deactData.message, 'new status:', deactData.product?.status);

  // Activate back
  const actRes = await fetch('http://localhost:5001/api/products/' + product._id + '/activate', {
    method: 'PATCH',
    headers: { Authorization: 'Bearer ' + token }
  });
  const actData = await actRes.json();
  console.log('Activate status:', actRes.status, actData.message, 'new status:', actData.product?.status);

  process.exit(0);
}
test();
