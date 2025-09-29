const ProviderFactory = require('./providers/ProviderFactory');

// Test provider loading
console.log('Testing provider loading...');

try {
  // Initialize providers
  ProviderFactory.initialize();
  
  // List all loaded providers
  const providers = ProviderFactory.listProviders();
  console.log('Loaded providers:', providers);
  
  // Test creating YellinLapidotProvider
  const mockSiteConfig = {
    displayName: 'Yellin Lapidot',
    loginUrl: 'https://online.yl-invest.co.il/agents/',
    selectors: {
      idField: 'input[name="id"]',
      phoneField: 'input[name="phone"]'
    }
  };
  
  const mockVendor = {
    id: '123456789',
    phone: '0501234567'
  };
  
  const mockJob = {
    id: 'test_123',
    site_id: 'yellin_lapidot',
    user_id: 'test_user'
  };
  
  const provider = ProviderFactory.getProvider('yellin_lapidot', mockSiteConfig, mockVendor, mockJob);
  console.log('Successfully created YellinLapidotProvider:', provider.constructor.name);
  console.log('Provider has fillLoginForm method:', typeof provider.fillLoginForm === 'function');
  console.log('Provider has submitLoginForm method:', typeof provider.submitLoginForm === 'function');
  console.log('Provider has enterOTP method:', typeof provider.enterOTP === 'function');
  
} catch (error) {
  console.error('Error testing provider loading:', error.message);
  process.exit(1);
}

console.log('Provider loading test completed successfully!');
