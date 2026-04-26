// scripts/update-data.js
const DOTMScraper = require('./scraper');

// For Vercel deployment, this can be triggered via API endpoint
// For local testing, run with: node scripts/update-data.js

async function runScraper() {
    const scraper = new DOTMScraper();
    try {
        await scraper.scrapeAll();
        console.log('Scheduled update completed successfully');
        return { success: true, message: 'Data updated successfully' };
    } catch (error) {
        console.error('Scheduled update failed:', error);
        return { success: false, error: error.message };
    }
}

// Run immediately if called directly
if (require.main === module) {
    runScraper().then(() => process.exit(0));
}

module.exports = { runScraper };