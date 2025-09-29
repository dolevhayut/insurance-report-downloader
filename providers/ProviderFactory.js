const fs = require('fs');
const path = require('path');

class ProviderFactory {
  static providers = {};

  static initialize() {
    // טעינת כל הספקים באופן דינמי
    const providersDir = __dirname;
    const files = fs.readdirSync(providersDir);
    
    files.forEach(file => {
      if (file.endsWith('Provider.js') && file !== 'BaseProvider.js' && file !== 'ProviderFactory.js') {
        try {
          const providerName = file.replace('Provider.js', '');
          const providerClass = require(path.join(providersDir, file));
          
          // המרת שם הקובץ לשם הספק
          // YellinLapidotProvider -> yellin_lapidot
          const siteId = providerName
            .replace(/([A-Z])/g, '_$1')
            .toLowerCase()
            .substring(1);
          
          this.providers[siteId] = providerClass;
          console.log(`Loaded provider: ${siteId}`);
        } catch (error) {
          console.error(`Failed to load provider ${file}:`, error.message);
        }
      }
    });
  }

  static getProvider(siteId, siteConfig, vendor, job) {
    // טעינה ראשונית אם עוד לא נטענו
    if (Object.keys(this.providers).length === 0) {
      this.initialize();
    }
    
    const ProviderClass = this.providers[siteId];
    
    if (!ProviderClass) {
      console.warn(`No specific provider found for ${siteId}, using base provider`);
      return new (require('./BaseProvider'))(siteConfig, vendor, job);
    }
    
    return new ProviderClass(siteConfig, vendor, job);
  }

  static listProviders() {
    if (Object.keys(this.providers).length === 0) {
      this.initialize();
    }
    
    return Object.keys(this.providers);
  }
}

module.exports = ProviderFactory;
