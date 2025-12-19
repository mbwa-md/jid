// server.js
const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const axios = require('axios');
const cors = require('cors');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve the main HTML file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API Endpoints

// 1. AI Chat API
app.post('/api/ai', async (req, res) => {
    try {
        const { message } = req.body;
        const response = await axios.get(`https://lance-frank-asta.onrender.com/api/gpt?q=${encodeURIComponent(message)}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'AI service unavailable' });
    }
});

// 2. Song Download API
app.get('/api/song', async (req, res) => {
    try {
        const { query } = req.query;
        const response = await axios.get(`https://izumiiiiiiii.dpdns.org/downloader/youtube-play?query=${encodeURIComponent(query)}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Song service unavailable' });
    }
});

// 3. Image Generator API
app.post('/api/image', async (req, res) => {
    try {
        const { prompt } = req.body;
        const response = await axios.get(`https://shizoapi.onrender.com/api/ai/imagine?apikey=shizo&query=${encodeURIComponent(prompt)}`, {
            responseType: 'arraybuffer'
        });
        res.set('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Image generation failed' });
    }
});

// 4. TikTok Search API
app.get('/api/tiktok', async (req, res) => {
    try {
        const { username } = req.query;
        const response = await axios.get(`https://api.siputzx.my.id/api/stalk/tiktok?username=${encodeURIComponent(username)}`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'TikTok service unavailable' });
    }
});

// 5. Pies Images API
app.get('/api/pies/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const response = await axios.get(`https://shizoapi.onrender.com/api/pies/${category}`, {
            responseType: 'arraybuffer'
        });
        res.set('Content-Type', 'image/png');
        res.send(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Pies service unavailable' });
    }
});

// 6. Pair Code Generator
app.post('/api/pair', (req, res) => {
    const { number } = req.body;
    
    if (!number || number.length < 10) {
        return res.status(400).json({ error: 'Invalid phone number' });
    }
    
    // Generate 8-character code
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Save to file (in production use database)
    const pairData = {
        id: uuidv4(),
        code: code,
        number: number,
        created: new Date().toISOString(),
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        used: false
    };
    
    // Read existing pairs
    let pairs = [];
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'pairs.json'), 'utf8');
        pairs = JSON.parse(data);
    } catch (error) {
        // File doesn't exist, create empty array
    }
    
    // Add new pair
    pairs.push(pairData);
    
    // Save back to file
    fs.ensureDirSync(path.join(__dirname, 'data'));
    fs.writeFileSync(path.join(__dirname, 'data', 'pairs.json'), JSON.stringify(pairs, null, 2));
    
    res.json({
        success: true,
        code: code,
        message: `Pair code generated for ${number}. Valid for 24 hours.`
    });
});

// 7. Verify Pair Code
app.post('/api/verify-pair', (req, res) => {
    const { code } = req.body;
    
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'pairs.json'), 'utf8');
        const pairs = JSON.parse(data);
        
        const pair = pairs.find(p => p.code === code && !p.used && new Date(p.expires) > new Date());
        
        if (pair) {
            // Mark as used
            pair.used = true;
            pair.usedAt = new Date().toISOString();
            fs.writeFileSync(path.join(__dirname, 'data', 'pairs.json'), JSON.stringify(pairs, null, 2));
            
            res.json({
                success: true,
                number: pair.number,
                message: 'Pair code verified successfully!'
            });
        } else {
            res.status(404).json({ error: 'Invalid or expired pair code' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Verification failed' });
    }
});

// 8. Admin API - Get Posts
app.get('/api/posts', (req, res) => {
    try {
        const data = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'), 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        res.json([]);
    }
});

// 9. Admin API - Save Post
app.post('/api/posts', (req, res) => {
    try {
        const post = req.body;
        post.id = uuidv4();
        post.time = new Date().toISOString().slice(0, 16).replace('T', ' ');
        
        let posts = [];
        try {
            const data = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'), 'utf8');
            posts = JSON.parse(data);
        } catch (error) {
            // File doesn't exist
        }
        
        posts.unshift(post);
        fs.ensureDirSync(path.join(__dirname, 'data'));
        fs.writeFileSync(path.join(__dirname, 'data', 'posts.json'), JSON.stringify(posts, null, 2));
        
        res.json({ success: true, message: 'Post saved successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to save post' });
    }
});

// 10. Admin API - Delete Post
app.delete('/api/posts/:id', (req, res) => {
    try {
        const { id } = req.params;
        let posts = [];
        
        try {
            const data = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'), 'utf8');
            posts = JSON.parse(data);
        } catch (error) {
            return res.status(404).json({ error: 'No posts found' });
        }
        
        const filteredPosts = posts.filter(post => post.id !== id);
        fs.writeFileSync(path.join(__dirname, 'data', 'posts.json'), JSON.stringify(filteredPosts, null, 2));
        
        res.json({ success: true, message: 'Post deleted successfully!' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

// 11. Stats API
app.get('/api/stats', (req, res) => {
    try {
        const stats = {
            totalPosts: 0,
            totalVisits: 0,
            activeUsers: Math.floor(Math.random() * 100) + 50,
            pairCodes: 0
        };
        
        // Read posts
        try {
            const postsData = fs.readFileSync(path.join(__dirname, 'data', 'posts.json'), 'utf8');
            stats.totalPosts = JSON.parse(postsData).length;
        } catch (error) {}
        
        // Read visits
        try {
            const visitsData = fs.readFileSync(path.join(__dirname, 'data', 'visits.json'), 'utf8');
            stats.totalVisits = JSON.parse(visitsData).count || 0;
        } catch (error) {}
        
        // Read pairs
        try {
            const pairsData = fs.readFileSync(path.join(__dirname, 'data', 'pairs.json'), 'utf8');
            stats.pairCodes = JSON.parse(pairsData).length;
        } catch (error) {}
        
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

// 12. Track Visit
app.post('/api/visit', (req, res) => {
    try {
        let visits = { count: 0 };
        try {
            const data = fs.readFileSync(path.join(__dirname, 'data', 'visits.json'), 'utf8');
            visits = JSON.parse(data);
        } catch (error) {
            // File doesn't exist
        }
        
        visits.count++;
        visits.lastVisit = new Date().toISOString();
        
        fs.ensureDirSync(path.join(__dirname, 'data'));
        fs.writeFileSync(path.join(__dirname, 'data', 'visits.json'), JSON.stringify(visits, null, 2));
        
        res.json({ success: true, count: visits.count });
    } catch (error) {
        res.status(500).json({ error: 'Failed to track visit' });
    }
});

// 13. Chat All Messages
const chatMessages = [];

app.get('/api/chat', (req, res) => {
    res.json(chatMessages.slice(-50)); // Return last 50 messages
});

app.post('/api/chat', (req, res) => {
    const { user, message } = req.body;
    
    const chatMessage = {
        id: uuidv4(),
        user: user || 'Anonymous',
        message: message,
        timestamp: new Date().toISOString(),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(user || 'User')}&background=random`
    };
    
    chatMessages.push(chatMessage);
    
    // Keep only last 100 messages
    if (chatMessages.length > 100) {
        chatMessages.shift();
    }
    
    res.json({ success: true, message: chatMessage });
});

// Create data directory if it doesn't exist
fs.ensureDirSync(path.join(__dirname, 'data'));

// Initialize data files if they don't exist
const defaultPosts = [
    {
        id: "1",
        icon: "https://files.catbox.moe/jwmx1j.jpg",
        title: "FREE BOT ALERT✅",
        time: new Date().toISOString().slice(0, 16).replace('T', ' '),
        content: `⚡ <strong>FREE BOT ALERT!</strong> ⚡<br><br>
🚀 A Powerful WhatsApp Bot is LIVE for FREE!<br>
🤖 Auto • Fast • Smart • Easy Deploy<br><br>
🔥 DROP NOW on our Channel<br>
👉 Don't miss this chance — JOIN US TODAY!<br>
💥 Free access • Tech lovers only • Limited time<br><br>
📢 Join & Stay Updated — Don't Be Left Behind! 🚨✨`,
        type: "alert"
    },
    {
        id: "2",
        icon: "https://img.icons8.com/color/96/000000/whatsapp--v1.png",
        title: "🖤SILA TECH CHANNEL🖤",
        time: new Date(Date.now() - 86400000).toISOString().slice(0, 16).replace('T', ' '),
        content: `🖤<strong>SILA TECH CHANNEL</strong>🖤<br><br>
🚀 Tech Made Simple & Fun!<br><br>
📱 Phone Tips<br>
🤖 Free Bots<br>
💻 Tech Tricks<br>
😂 Little Tech Comedy<br><br>
👉 Join now & level up your tech game!<br>
🔥 Don't miss out!<br><br>
🔗 <a href="https://whatsapp.com/channel/0029VbBG4gfISTkCpKxyMH02" target="_blank" style="color: #00ff9d;">Join Channel Here</a>`,
        type: "update"
    }
];

if (!fs.existsSync(path.join(__dirname, 'data', 'posts.json'))) {
    fs.writeFileSync(path.join(__dirname, 'data', 'posts.json'), JSON.stringify(defaultPosts, null, 2));
}

if (!fs.existsSync(path.join(__dirname, 'data', 'visits.json'))) {
    fs.writeFileSync(path.join(__dirname, 'data', 'visits.json'), JSON.stringify({ count: 0, lastVisit: new Date().toISOString() }, null, 2));
}

if (!fs.existsSync(path.join(__dirname, 'data', 'pairs.json'))) {
    fs.writeFileSync(path.join(__dirname, 'data', 'pairs.json'), JSON.stringify([], null, 2));
}

// Start server
app.listen(PORT, () => {
    console.log(`🚀 SILA X WEED BOT PRO 2026`);
    console.log(`✅ Server running on port ${PORT}`);
    console.log(`✅ Admin Panel: http://localhost:${PORT}`);
    console.log(`✅ API Endpoints ready`);
    console.log(`✅ Features: AI Chat, Song Download, Image Generation, TikTok Search, etc.`);
    console.log(`📞 Contacts: Sila (2556124915540), Weed Tech (+50939032060)`);
});
