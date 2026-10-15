// scripts/update-data.js
const DOTMScraper = require('./scraper');

function parseCliArgs() {
    const args = process.argv.slice(2);
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--force') {
            options.force = true;
        } else if (arg.startsWith('--office=')) {
            options.office = arg.split('=')[1].trim();
        } else if (arg === '--office' && i + 1 < args.length) {
            options.office = args[++i].trim();
        } else if (arg.startsWith('--url=')) {
            options.url = arg.split('=')[1].trim();
        } else if (arg === '--url' && i + 1 < args.length) {
            options.url = args[++i].trim();
        }
    }
    return options;
}

async function runScraper(options = {}) {
    const cliOptions = parseCliArgs();
    const mergedOptions = {
        ...cliOptions,
        ...options,
        force: Boolean(options.force || cliOptions.force || process.env.FORCE_SCRAPE === '1' || process.env.FORCE_SCRAPE === 'true'),
        office: options.office || cliOptions.office || process.env.TARGET_OFFICE || '',
        url: options.url || cliOptions.url || process.env.TARGET_URL || '',
    };
    const scraper = new DOTMScraper();
    try {
        const ranToEnd = await scraper.scrapeAll(mergedOptions);
        const success = Boolean(ranToEnd && scraper.stats.failed === 0);
        const result = {
            success,
            message: success
                ? 'DOTM data updated successfully'
                : scraper.stats.circuitBreakerTripped
                    ? 'Scraper stopped early: government CDN is offline (circuit breaker tripped)'
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

module.exports = { runScraper, parseCliArgs };
