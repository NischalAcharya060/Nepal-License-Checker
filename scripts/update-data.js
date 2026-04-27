// scripts/update-data.js
const DOTMScraper = require('./scraper');

async function runScraper() {
    const scraper = new DOTMScraper();
    try {
        const ranToEnd = await scraper.scrapeAll();
        const success = Boolean(ranToEnd && scraper.stats.failed === 0);
        const result = {
            success,
            message: success
                ? 'DOTM data updated successfully'
                : 'Scraper finished with issues (check stats.failed)',
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
        .then((result) => process.exit(result.success ? 0 : 1))
        .catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runScraper };
