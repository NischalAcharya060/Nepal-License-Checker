// scripts/scraper.js
require('dotenv').config();

const axios = require('axios');
const cheerio = require('cheerio');
const pdfParse = require('pdf-parse');
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Initialize Firebase Admin using environment variables
const serviceAccount = {
    project_id: process.env.FIREBASE_ADMIN_PROJECT_ID,
    client_email: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

initializeApp({
    credential: cert(serviceAccount)
});

const db = getFirestore();

class DOTMScraper {
    constructor() {
        this.baseURL = 'https://dotm.gov.np';
        this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
    }

    async fetchPage(url, retries = 3) {
        for (let i = 0; i < retries; i++) {
            try {
                const response = await axios.get(url, {
                    headers: {
                        'User-Agent': this.userAgent,
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                        'Accept-Language': 'en-US,en;q=0.5',
                    },
                    timeout: 30000,
                });
                return response.data;
            } catch (error) {
                console.error(`Attempt ${i + 1} failed for ${url}:`, error.message);
                if (i === retries - 1) throw error;
                await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
            }
        }
    }

    async fetchPDF(url) {
        try {
            const response = await axios.get(url, {
                headers: {
                    'User-Agent': this.userAgent,
                },
                timeout: 60000,
                responseType: 'arraybuffer'
            });
            return response.data;
        } catch (error) {
            console.error(`Failed to fetch PDF from ${url}:`, error.message);
            throw error;
        }
    }

    async extractPDFText(pdfBuffer) {
        try {
            const data = await pdfParse(pdfBuffer);
            return data.text;
        } catch (error) {
            console.error('Failed to parse PDF:', error.message);
            return '';
        }
    }

    parseLicenseDataFromText(text) {
        const licenses = [];
        
        // Split text into lines
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        
        // License number pattern: XX-XX-XXXXXXXX
        const licensePattern = /^(\d{2}-\d{2}-\d{8})\s+(.+?)\s+([A-C](?:\/[A-C])*)\s*(.*)/;
        
        for (const line of lines) {
            const match = line.match(licensePattern);
            if (match) {
                try {
                    const [, licenseNumber, name, category, ...rest] = match;
                    
                    // Clean up data
                    const holder_name = name.trim().replace(/\s+/g, ' ');
                    const office = rest.join(' ').trim() || 'Unknown';
                    
                    if (holder_name && licenseNumber) {
                        licenses.push({
                            license_number: licenseNumber.trim(),
                            holder_name: holder_name,
                            office: office,
                            category: category.trim(),
                            createdAt: new Date(),
                            updatedAt: new Date()
                        });
                    }
                } catch (error) {
                    // Skip malformed lines
                    continue;
                }
            }
        }
        
        return licenses;
    }

    async getOfficePages() {
        try {
            console.log('Fetching category page to find office links...');
            const html = await this.fetchPage(`${this.baseURL}/category/details-of-printed-licenses/`);
            const $ = cheerio.load(html);
            
            const officeLinks = [];
            
            // Extract links to office-specific pages
            $('a[href*="/content/"]').each((index, element) => {
                let href = $(element).attr('href');
                const text = $(element).text().trim();
                
                if (href) {
                    // Clean up the href - remove newlines and extra whitespace
                    href = href.replace(/\s+/g, ' ').trim();
                    
                    // Skip if empty after cleaning
                    if (!href) return;
                    
                    const fullUrl = href.startsWith('http') ? href : `${this.baseURL}${href}`;
                    
                    if (!officeLinks.some(l => l.url === fullUrl)) {
                        officeLinks.push({
                            url: fullUrl,
                            title: text
                        });
                    }
                }
            });
            
            console.log(`Found ${officeLinks.length} office pages`);
            return officeLinks;
        } catch (error) {
            console.error('Failed to get office pages:', error.message);
            return [];
        }
    }

    async extractPDFUrlFromPage(pageUrl) {
        try {
            const html = await this.fetchPage(pageUrl);
            
            // Search for PDF URL in the HTML content
            const pdfUrlMatch = html.match(/https?:\/\/[^\s"'<>]*\.pdf/i);
            
            if (pdfUrlMatch) {
                return pdfUrlMatch[0];
            }
            
            // Alternative: look for PDFobject or PDF.js script tags
            const cheerioMatch = html.match(/PDFobject\.embed\s*\(\s*["']([^"']+\.pdf)["']/i);
            if (cheerioMatch) {
                return cheerioMatch[1];
            }
            
            return null;
        } catch (error) {
            console.error(`Failed to extract PDF URL from ${pageUrl}:`, error.message);
            return null;
        }
    }

    async scrapeOffice(officeUrl, officeName) {
        try {
            console.log(`\nProcessing ${officeName}...`);
            
            // Get PDF URL from office page
            const pdfUrl = await this.extractPDFUrlFromPage(officeUrl);
            
            if (!pdfUrl) {
                console.log(`No PDF found for ${officeName}`);
                return [];
            }
            
            console.log(`Found PDF: ${pdfUrl}`);
            
            // Download PDF
            const pdfBuffer = await this.fetchPDF(pdfUrl);
            
            // Extract text from PDF
            const pdfText = await this.extractPDFText(pdfBuffer);
            
            // Parse license data from PDF text
            const licenses = this.parseLicenseDataFromText(pdfText);
            
            console.log(`Extracted ${licenses.length} licenses from ${officeName}`);
            return licenses;
        } catch (error) {
            console.error(`Error processing ${officeName}:`, error.message);
            return [];
        }
    }

    async saveLicenses(licenses) {
        let saved = 0;
        let updated = 0;
        let failed = 0;

        for (const license of licenses) {
            try {
                const licenseRef = db.collection('licenses').doc(license.license_number);
                const doc = await licenseRef.get();

                if (doc.exists) {
                    // Update existing license
                    await licenseRef.update({
                        holder_name: license.holder_name,
                        office: license.office,
                        category: license.category,
                        updatedAt: new Date()
                    });
                    updated++;
                } else {
                    // Create new license
                    await licenseRef.set(license);
                    saved++;
                }
            } catch (error) {
                console.error(`Failed to save license ${license.license_number}:`, error.message);
                failed++;
            }
        }

        return { saved, updated, failed };
    }

    async scrapeAll() {
        console.log('Starting DOTM license scraper...');
        
        try {
            // Get all office pages
            const officePages = await this.getOfficePages();
            
            if (officePages.length === 0) {
                console.log('No office pages found');
                return false;
            }
            
            let allLicenses = [];
            
            // Process each office
            for (const office of officePages) {
                const licenses = await this.scrapeOffice(office.url, office.title);
                allLicenses = allLicenses.concat(licenses);
                
                // Save in batches to avoid overwhelming Firebase
                if (allLicenses.length >= 100) {
                    const result = await this.saveLicenses(allLicenses);
                    console.log(`Batch saved - New: ${result.saved}, Updated: ${result.updated}, Failed: ${result.failed}`);
                    allLicenses = [];
                }
                
                // Delay between offices
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
            
            // Save remaining licenses
            if (allLicenses.length > 0) {
                const result = await this.saveLicenses(allLicenses);
                console.log(`Final batch saved - New: ${result.saved}, Updated: ${result.updated}, Failed: ${result.failed}`);
            }
            
            console.log('Scraping completed successfully');
            return true;
        } catch (error) {
            console.error('Scraping failed:', error);
            return false;
        }
    }
}

// Main execution
async function main() {
    const scraper = new DOTMScraper();

    try {
        await scraper.scrapeAll();
        console.log('Scraping completed successfully');
    } catch (error) {
        console.error('Scraper failed:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = DOTMScraper;