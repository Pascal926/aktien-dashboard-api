// CLOUD-OPTIMIERTE API FÜR VERCEL + MONGODB ATLAS
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS für alle Domains (CodePen kompatibel)
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false
}));

app.use(express.json());

// MONGODB ATLAS KONFIGURATION
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pascaleichenberg:UTLgQ4vhWZTARw4q@cluster0.ttpr498.mongodb.net/GKI?retryWrites=true&w=majority';
const DATABASE_NAME = 'GKI';

// Collection Mapping (wie bisher)
const COLLECTIONS = {
    'SAP': 'SAP',
    'Microsoft': 'Microsoft',
    'Nestlé': 'Nestle',
    'Procter & Gamble': 'Procta & Gamble',
    'MSCI World': 'MSCI World'
};

// Chart-Farben
const STOCK_COLORS = {
    'SAP': '#0053e7',
    'Microsoft': '#00a2ed',
    'Nestlé': '#d71421',
    'Procter & Gamble': '#005eb8',
    'MSCI World': '#4CAF50'
};

let db;
let client;

// Verbesserte Preis-Parser für Atlas String-Daten
function parsePrice(priceString) {
    if (typeof priceString === 'number') return priceString;
    if (!priceString) return null;
    
    // Für Atlas String-Format: "$171,39" → 171.39
    const clean = priceString.toString()
        .replace(/[$€£¥\s]/g, '')
        .replace(',', '.')
        .trim();
    
    const price = parseFloat(clean);
    return isNaN(price) ? null : price;
}

// MongoDB Atlas Verbindung
async function connectToAtlas() {
    try {
        console.log('🌐 Verbinde mit MongoDB Atlas...');
        
        client = new MongoClient(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        await client.connect();
        db = client.db(DATABASE_NAME);
        
        console.log('✅ MongoDB Atlas verbunden!');
        
        // Collections testen
        for (const [symbol, collectionName] of Object.entries(COLLECTIONS)) {
            try {
                const count = await db.collection(collectionName).countDocuments();
                console.log(`📊 ${symbol}: ${count} Datensätze`);
            } catch (error) {
                console.log(`⚠️ ${symbol}: Collection "${collectionName}" nicht gefunden`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Atlas Verbindungsfehler:', error.message);
        return false;
    }
}

// HAUPT-API: Chart-Daten für CodePen
app.get('/api/chart-data', async (req, res) => {
    try {
        console.log('📡 CodePen Chart Request von:', req.get('origin') || 'Unbekannt');
        
        if (!db) {
            const connected = await connectToAtlas();
            if (!connected) {
                return res.status(500).json({ 
                    success: false, 
                    error: 'Datenbankverbindung fehlgeschlagen' 
                });
            }
        }
        
        const chartData = [];
        
        for (const [stockName, collectionName] of Object.entries(COLLECTIONS)) {
            try {
                // Daten aus Atlas laden
                const stockData = await db.collection(collectionName)
                    .find({})
                    .sort({ "Date": 1 })
                    .toArray();
                
                if (stockData.length === 0) {
                    console.log(`⚠️ ${stockName}: Keine Daten gefunden`);
                    continue;
                }
                
                // Chart-Format konvertieren
                const priceData = stockData
                    .map(item => {
                        const price = parsePrice(item.Close);
                        return price ? {
                            date: item.Date,    // "15.05.2020"
                            price: price        // 171.39
                        } : null;
                    })
                    .filter(item => item !== null);
                
                if (priceData.length === 0) {
                    console.log(`⚠️ ${stockName}: Keine gültigen Preise`);
                    continue;
                }
                
                chartData.push({
                    label: stockName,
                    color: STOCK_COLORS[stockName],
                    data: priceData
                });
                
                console.log(`✅ ${stockName}: ${priceData.length} Datenpunkte`);
                
            } catch (error) {
                console.error(`❌ ${stockName} Fehler:`, error.message);
            }
        }
        
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            source: 'MongoDB Atlas',
            dataPoints: chartData.reduce((sum, stock) => sum + stock.data.length, 0),
            data: chartData
        };
        
        console.log(`✅ Chart-API: ${chartData.length} Aktien, ${response.dataPoints} Datenpunkte`);
        res.json(response);
        
    } catch (error) {
        console.error('❌ Chart-API Fehler:', error);
        res.status(500).json({ 
            success: false,
            error: 'Server-Fehler beim Laden der Chart-Daten',
            message: error.message 
        });
    }
});

// Health Check für Vercel
app.get('/api/health', async (req, res) => {
    try {
        let dbStatus = 'Nicht verbunden';
        let collections = 0;
        
        if (db) {
            dbStatus = 'Verbunden';
            const collectionsList = await db.listCollections().toArray();
            collections = collectionsList.length;
        }
        
        res.json({
            success: true,
            timestamp: new Date().toISOString(),
            server: 'Cloud API (Vercel)',
            database: {
                status: dbStatus,
                name: DATABASE_NAME,
                collections: collections,
                cluster: 'cluster0.ttpr498.mongodb.net'
            },
            environment: process.env.NODE_ENV || 'development'
        });
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Health Check fehlgeschlagen',
            message: error.message
        });
    }
});

// Root-Endpoint für Vercel
app.get('/', (req, res) => {
    res.json({
        message: '🚀 Aktien-Dashboard API',
        version: '2.0',
        status: 'Online',
        endpoints: {
            chartData: '/api/chart-data',
            health: '/api/health'
        },
        database: 'MongoDB Atlas',
        deployment: 'Vercel'
    });
});

// 404 Handler
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Endpoint nicht gefunden',
        availableEndpoints: [
            '/',
            '/api/chart-data',
            '/api/health'
        ]
    });
});

// Error Handler
app.use((error, req, res, next) => {
    console.error('❌ Unbehandelter Fehler:', error);
    res.status(500).json({
        error: 'Interner Server-Fehler',
        message: error.message
    });
});

// Graceful Shutdown für Cloud
process.on('SIGTERM', async () => {
    console.log('👋 Graceful Shutdown...');
    if (client) {
        await client.close();
    }
    process.exit(0);
});

// Server starten (Vercel-kompatibel)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, async () => {
        console.log('🚀 ================================');
        console.log('🚀 CLOUD API FÜR MONGODB ATLAS');
        console.log('🚀 ================================');
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`📊 Chart-API: http://localhost:${PORT}/api/chart-data`);
        console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
        console.log('🚀 ================================');
        
        await connectToAtlas();
        console.log('\n✅ API BEREIT FÜR CODEPEN!');
    });
}

// Export für Vercel
module.exports = app;
