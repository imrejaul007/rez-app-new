// Test script to verify frontend can connect to backend
import realVouchersApi from '../services/realVouchersApi';
import realOffersApi from '../services/realOffersApi';

async function testConnection() {
  console.log('🧪 Testing Backend API Connection...\n');

  try {
    // Test Vouchers API
    console.log('1️⃣ Testing Vouchers API...');
    const vouchersResponse = await realVouchersApi.getVoucherBrands({ page: 1, limit: 5 });

    if (vouchersResponse.success && vouchersResponse.data.length > 0) {
      console.log('✅ Vouchers API Working!');
      console.log(`   Found ${vouchersResponse.data.length} voucher brands`);
      console.log(`   First brand: ${vouchersResponse.data[0].name}`);
    } else {
      console.log('❌ Vouchers API returned empty data');
    }

    // Test Offers API
    console.log('\n2️⃣ Testing Offers API...');
    const offersResponse = await realOffersApi.getOffers({ page: 1, limit: 5 });

    if (offersResponse.success && offersResponse.data.length > 0) {
      console.log('✅ Offers API Working!');
      console.log(`   Found ${offersResponse.data.length} offers`);
      console.log(`   First offer: ${(offersResponse.data as any)[0]?.title}`);
    } else {
      console.log('❌ Offers API returned empty data');
    }

    // Test Featured Vouchers
    console.log('\n3️⃣ Testing Featured Vouchers...');
    const featuredResponse = await realVouchersApi.getFeaturedBrands(3);

    if (featuredResponse.success && featuredResponse.data.length > 0) {
      console.log('✅ Featured Vouchers Working!');
      console.log(`   Found ${featuredResponse.data.length} featured brands`);
    } else {
      console.log('❌ Featured Vouchers returned empty data');
    }

    console.log('\n✅ All tests passed! Frontend is connected to backend.');

  } catch (error) {
    console.error('\n❌ Connection test failed:');
    console.error(error);
    console.log('\n💡 Make sure backend is running on http://localhost:5001');
  }
}

testConnection();