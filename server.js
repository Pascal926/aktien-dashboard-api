// CLOUD-OPTIMIERTE API FÜR VERCEL + MONGODB ATLAS (Chart.js optimiert)
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

// Chart-Farben (Chart.js optimiert)
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

// Chart.js-optimierte Datum-Formatierung
function formatDateForChart(dateString) {
    if (!dateString) return null;
    
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return null;
        
        // Chart.js Zeit-Format: "2020-05-14"
        return date.toISOString().split('T')[0];
    } catch (error) {
        console.error('Datum-Parsing Fehler:', error);
        return null;
    }
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

// HAUPT-API: Chart-Daten für CodePen (Chart.js optimiert)
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
                // Daten aus Atlas laden (nach Datum sortiert)
                const stockData = await db.collection(collectionName)
                    .find({})
                    .sort({ "Date": 1 })
                    .toArray();
                
                if (stockData.length === 0) {
                    console.log(`⚠️ ${stockName}: Keine Daten gefunden`);
                    continue;
                }
                
                // Chart.js-Format konvertieren
                const chartPoints = stockData
                    .map(item => {
                        const price = parsePrice(item.Close);
                        const date = formatDateForChart(item.Date);
                        
                        // Chart.js verwendet x/y Format
                        return (price && date) ? {
                            x: date,  // "2020-05-14"
                            y: price  // 171.39
                        } : null;
                    })
                    .filter(item => item !== null);
                
                if (chartPoints.length === 0) {
                    console.log(`⚠️ ${stockName}: Keine gültigen Chart-Punkte`);
                    continue;
                }
                
                // Chart.js Dataset-Format
                chartData.push({
                    label: stockName,
                    data: chartPoints,
                    borderColor: STOCK_COLORS[stockName],
                    backgroundColor: STOCK_COLORS[stockName] + '20', // 20% opacity
                    borderWidth: 2,
                    fill: false,
                    tension: 0.1,
                    pointRadius: 0,
                    pointHoverRadius: 4
                });
                
                console.log(`✅ ${stockName}: ${chartPoints.length} Chart-Punkte`);
                
            } catch (error) {
                console.error(`❌ ${stockName} Fehler:`, error.message);
            }
        }
        
        const response = {
            success: true,
            timestamp: new Date().toISOString(),
            source: 'MongoDB Atlas',
            datasets: chartData.length,
            totalDataPoints: chartData.reduce((sum, dataset) => sum + dataset.data.length, 0),
            // Chart.js-kompatibles Format
            chartConfig: {
                type: 'line',
                data: {
                    datasets: chartData
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            type: 'time',
                            time: {
                                parser: 'YYYY-MM-DD',
                                displayFormats: {
                                    day: 'MMM DD',
                                    month: 'MMM YYYY'
                                }
                            },
                            title: {
                                display: true,
                                text: 'Datum'
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Kurs ($)'
                            },
                            beginAtZero: false
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: 'Aktienentwicklung (2020-2025)'
                        },
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            callbacks: {
                                title: function(context) {
                                    return new Date(context[0].parsed.x).toLocaleDateString('de-DE');
                                },
                                label: function(context) {
                                    return `${context.dataset.label}: $${context.parsed.y.toFixed(2)}`;
                                }
                            }
                        }
                    },
                    interaction: {
                        mode: 'nearest',
                        axis: 'x',
                        intersect: false
                    }
                }
            }
        };
        
        console.log(`✅ Chart-API: ${chartData.length} Datasets, ${response.totalDataPoints} Datenpunkte`);
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
            environment: process.env.NODE_ENV || 'development',
            chartJsOptimized: true
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
        message: '🚀 Aktien-Dashboard API (Chart.js optimiert)',
        version: '2.1',
        status: 'Online',
        endpoints: {
            chartData: '/api/chart-data',
            health: '/api/health'
        },
        database: 'MongoDB Atlas',
        deployment: 'Vercel',
        chartLibrary: 'Chart.js v4.4.0'
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
        console.log('🚀 CHART.JS OPTIMIERTE API');
        console.log('🚀 ================================');
        console.log(`🌐 Server: http://localhost:${PORT}`);
        console.log(`📊 Chart-API: http://localhost:${PORT}/api/chart-data`);
        console.log(`❤️ Health: http://localhost:${PORT}/api/health`);
        console.log('🚀 ================================');
        
        await connectToAtlas();
        console.log('\n✅ API BEREIT FÜR CHART.JS + CODEPEN!');
    });
}

// Export für Vercel
module.exports = app;
