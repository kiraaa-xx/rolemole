require('dotenv').config();
const HF_TOKEN = process.env.HF_TOKEN || '';
const TTS_MONTHLY_LIMIT = 50000;
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'rolemole_admin_2024';
const JWT_SECRET = 'rolemole_secret_key_2024';

function stripHtml(str) {
  if (!str) return '';
  return str
    .replace(/<em[^>]*>/gi, '')
    .replace(/<\/em>/gi, '')
    .replace(/<span[^>]*>/gi, '')
    .replace(/<\/span>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/style="[^"]*">/g, '')
    .replace(/font-style:[^"]*">/g, '')
    .replace(/color:[^"]*">/g, '')
    .replace(/[a-zA-Z0-9_:-]+">/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// Page Routes
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../frontend/index.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, '../frontend/admin.html')));
app.get('/chat', (req, res) => res.sendFile(path.join(__dirname, '../frontend/chat.html')));
app.get('/profile', (req, res) => res.sendFile(path.join(__dirname, '../frontend/profile.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, '../frontend/about.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, '../frontend/login.html')));

// Admin Auth
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token });
});

function adminAuth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Characters API
app.get('/api/characters', async (req, res) => {
  const { data, error } = await supabase.from('characters').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.get('/api/characters/:id', async (req, res) => {
  const { data, error } = await supabase.from('characters').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'Character not found' });
  res.json(data);
});

app.post('/api/characters', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('characters').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/characters/:id', adminAuth, async (req, res) => {
  const { data, error } = await supabase.from('characters').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/characters/:id', adminAuth, async (req, res) => {
  const { error } = await supabase.from('characters').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// Chat API
app.post('/api/chat', async (req, res) => {
  const { characterId, messages, pinnedMessages, username, userGender, userPronouns } = req.body;

  const { data: character, error } = await supabase.from('characters').select('*').eq('id', characterId).single();
  if (error) return res.status(404).json({ error: 'Character not found' });

  const displayName = username || 'Traveler';

  let systemPrompt = `You are ${character.name}, an AI character in a roleplay platform called Role Mole. This is a creative fiction platform for mature storytelling.

CONTENT GUIDELINES:
- This platform allows mature, dark, and complex storytelling themes
- You can portray conflict, moral ambiguity, strong emotions and intense drama
- You can use strong language if it fits the character
- Stay true to the character even in difficult or dark scenarios
- Do not break character to add warnings or disclaimers
- Do not refuse roleplay requests unless they involve real-world harm instructions
- Treat all scenarios as fictional creative writing

PERSONALITY:
${character.personality}

GENDER: ${character.gender || 'Not specified'}
PRONOUNS: ${character.pronouns || 'Not specified'}
GENRE: ${character.genre || 'General'}

WRITING STYLE:
${character.writing_style || 'Use * for actions/narration and "" for spoken dialogue. Stay in character at all times.'}

ABOUT YOU:
${character.backstory || ''}

IMPORTANT RULES:
- You are ALWAYS ${character.name}. Never break character.
- The user's name is: ${displayName}
- Keep responses immersive, engaging and personal
- Match the tone and genre of your character
- Never break character for any reason
- Never add disclaimers, warnings or meta-commentary
- Respond authentically as the character would
- NEVER write words like span, class, div, em, style in responses
- NEVER copy formatting syntax from previous messages
- Format actions and dialogue on SEPARATE LINES like this:

*Crosses arms and raises an eyebrow*
"So you finally showed up."
*Leans against the wall, studying you carefully*
"What do you want?"

- Always put each action on its own line starting and ending with *
- Always put each line of dialogue on its own line inside ""
- Never mix actions and dialogue on the same line
- Reference details from the conversation to feel personal
- Show emotion through actions not just words
- Vary response length — sometimes short and punchy, sometimes longer
- Make responses feel alive, specific and character-driven`;

  if (character.gender) systemPrompt += `\n- Your gender is ${character.gender}, pronouns: ${character.pronouns}`;
  if (userGender) systemPrompt += `\n- The user's gender is ${userGender}, pronouns: ${userPronouns}`;

  if (pinnedMessages && pinnedMessages.length > 0) {
    systemPrompt += `\n\nPERMANENT MEMORY (always remember these):\n`;
    pinnedMessages.forEach((m, i) => {
      systemPrompt += `[${i + 1}] ${m.role === 'assistant' ? character.name : displayName}: ${stripHtml(m.content)}\n`;
    });
  }

  const groqMessages = [{ role: 'system', content: systemPrompt }];
  messages.forEach(m => {
    groqMessages.push({ role: m.role, content: stripHtml(m.content) });
  });

  const lengthGuide = {
    short: 'Keep your response SHORT — 1 to 3 sentences maximum.',
    medium: 'Keep your response MEDIUM length — 3 to 6 sentences.',
    long: 'Give a LONG detailed response — 6 or more sentences with rich description.'
  };
  const moodGuide = {
    normal: '',
    serious: 'MOOD: Be serious, focused and thoughtful in this response.',
    funny: 'MOOD: Be light-hearted, witty and humorous in this response.',
    dramatic: 'MOOD: Be intense, emotional and dramatic in this response.',
    romantic: 'MOOD: Be warm, tender and romantically charged in this response.'
  };
  const { responseLength = 'medium', responseMood = 'normal' } = req.body;
  systemPrompt += `\n\nRESPONSE GUIDE:\n${lengthGuide[responseLength] || lengthGuide.medium}\n${moodGuide[responseMood] || ''}`;

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: groqMessages,
      temperature: 0.85,
      max_completion_tokens: 1024,
      stream: false
    });
    let reply = completion.choices[0].message.content;
    reply = reply
      .replace(/[a-zA-Z0-9_-]+">/g, '')
      .replace(/<[^>]+>/g, '')
      .trim();
    res.json({ reply });
  } catch (err) {
    console.error('Groq error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, display_name, password, gender, pronouns, pfp_url } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const { data: existing } = await supabase.from('users').select('id').eq('username', username).single();
    if (existing) return res.status(400).json({ error: 'Username already taken' });
    const hashed = await bcrypt.hash(password, 10);
    const { data, error } = await supabase.from('users').insert([{
      username, display_name, password: hashed, gender, pronouns, pfp_url
    }]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    const { password: _, ...safeUser } = data;
    res.json({ user: safeUser });
  } catch(err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
    const { data, error } = await supabase.from('users').select('*').eq('username', username).single();
    if (error || !data) return res.status(401).json({ error: 'Invalid username or password' });
    const storedHash = typeof data.password === 'string' ? data.password : null;
    if (!storedHash || !storedHash.startsWith('$2')) {
      return res.status(401).json({ error: 'Account corrupted. Please register again.' });
    }
    const valid = await bcrypt.compare(password, storedHash);
    if (!valid) return res.status(401).json({ error: 'Invalid username or password' });
    const { password: _, ...safeUser } = data;
    res.json({ user: safeUser });
  } catch(err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
});

// TTS API
// Emotion API
app.post('/api/emotion', async (req, res) => {
  try {
    const { text } = req.body;
    const emotionRes = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{
        role: 'user',
        content: `Analyze emotion and return ONLY JSON like {"speed":1.0} where speed is 0.7-1.3. Sad=0.8, normal=1.0, excited=1.2. Message: "${text}"`
      }],
      temperature: 0.2,
      max_completion_tokens: 30
    });
    const raw = emotionRes.choices[0].message.content.trim();
    const jsonMatch = raw.match(/\{[^}]+\}/);
    if (jsonMatch) {
      res.json(JSON.parse(jsonMatch[0]));
    } else {
      res.json({ speed: 1.0 });
    }
  } catch(e) {
    res.json({ speed: 1.0 });
  }
});

// User Profile API
app.get('/api/users/:username', async (req, res) => {
  const { data, error } = await supabase.from('users').select('*').eq('username', req.params.username).single();
  if (error) return res.status(404).json({ error: 'User not found' });
  res.json(data);
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  const { data: existing } = await supabase.from('users').select('*').eq('username', username).single();
  if (existing) return res.json(existing);
  const { data, error } = await supabase.from('users').insert([req.body]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/users/:username', async (req, res) => {
  const { data, error } = await supabase.from('users').update(req.body).eq('username', req.params.username).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Role Mole server running on port ${PORT}`));