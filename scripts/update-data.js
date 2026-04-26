// scripts/update-data.js
const DOTMScraper = require('./scraper');

async function runScraper() {
    const scraper = new DOTMScraper();
    try {
        const success = await scraper.scrapeAll();
        const result = {
            success,
            message: success ? 'DOTM data updated successfully' : 'Scraper finished with issues',
            timestamp: new Date().toISOString(),
            stats: scraper.stats,
        };
        console.log(JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Scraper run failed:', error);
        return {
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        };
    }
}

if (require.main === module) {
    runScraper()
        .then(() => process.exit(0))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runScraper };
