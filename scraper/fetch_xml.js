//fetch_xml.js

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const js2xmlparser = require("js2xmlparser");
const cheerio = require('cheerio');

// Use the Absolute Path pattern for Windows/IIS reliability
const ROOT_DIR = path.join(__dirname, '..'); 
const CARDS_FILE = path.join(ROOT_DIR, 'json', 'stage2_cards.json');
const XML_DIR = path.join(ROOT_DIR, 'xml');
const LIBRARIES_FILE = path.join(ROOT_DIR, 'json', 'Libraries.json');
const lib = JSON.parse(fs.readFileSync(LIBRARIES_FILE, 'utf8'));


if (!fs.existsSync(XML_DIR)) {
    fs.mkdirSync(XML_DIR, { recursive: true });
}

async function downloadAll() {
    console.log(`📂 Destination: ${XML_DIR}`);
    
    if (!fs.existsSync(CARDS_FILE)) {
        return console.error(`❌ Source file not found: ${CARDS_FILE}`);
    }

    const cards = JSON.parse(fs.readFileSync(CARDS_FILE, 'utf8'));
    const runnersMap = new Map(); // Use a Map for cleaner unique-checking
    
    Object.values(cards).forEach(m => {
        m.races.forEach(r => {
            r.runners.forEach(run => {
                if (run.id) runnersMap.set(run.id, run.name);
            });
        });
    });

    const runners = Array.from(runnersMap.entries());
    console.log(`📡 Targeting ${runners.length} unique horse profiles...`);

    for (let i = 0; i < runners.length; i++) {
        const [id, name] = runners[i];
        const filePath = path.join(XML_DIR, `${id}.xml`);

        // CACHE CHECK
        if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            const isToday = new Date(stats.mtime).toDateString() === new Date().toDateString();
            if (isToday) {
                console.log(`[${i+1}/${runners.length}] ⏭️ Skipping: ${name}`);
                continue; 
            }
        }

        try {
            const url = `https://www.sportinglife.com/racing/profiles/horse/${id}`;
            const response = await axios.get(url, {
                timeout: 15000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0.0.0 Safari/537.36',
                    'Accept-Language': 'en-US,en;q=0.9'
                }
            });

            const $ = cheerio.load(response.data);
            const scriptTag = $("script[type='application/json']");
            
            if (scriptTag.length > 0) {
                // SportingLife usually puts the data in the first script tag or #__NEXT_DATA__
                const rawJson = JSON.parse(scriptTag[0].children[0].data);
                const profileData = rawJson.props?.pageProps?.profile;
                
                if (profileData) {
                    const xml = js2xmlparser.parse("horse_profile", profileData);
                    fs.writeFileSync(filePath, xml);
                    console.log(`[${i+1}/${runners.length}] ✅ Saved: ${name}`);
                } else {
                    console.log(`[${i+1}/${runners.length}] ⚠️ No profile data in JSON for: ${name}`);
                }
            }
        } catch (e) {
            console.log(`[${i+1}/${runners.length}] ❌ Failed: ${name} - ${e.message}`);
            if (e.response && e.response.status === 403) {
                console.error("🛑 403 Forbidden: SportingLife has throttled the IP. Stopping.");
                break;
            }
        }

        // Polite delay
        await new Promise(r => setTimeout(r, 2000));
    }
    console.log("🏁 XML Download Process Complete.");
}

downloadAll();