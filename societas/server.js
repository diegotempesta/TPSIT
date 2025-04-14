// Importazione dei moduli necessari
const express = require('express');             // Framework per server web
const bodyParser = require('body-parser');        // Middleware per leggere i dati inviati via POST
const path = require('path');                     // Modulo per gestire i percorsi dei file
const fs = require('fs');                         // Modulo per operazioni sul filesystem
const session = require('express-session');       // Middleware per gestire le sessioni
const multer = require('multer');                 // Middleware per gestire l'upload dei file

const app = express();                            // Inizializzazione dell'app Express
const PORT = 3000;                                // Porta su cui il server ascolterà

// Configurazione del motore di template EJS
app.set('view engine', 'ejs');                    
app.set('views', path.join(__dirname, 'views'));  // Directory contenente le view

// Configurazione di body-parser per analizzare i dati in POST
app.use(bodyParser.urlencoded({ extended: true }));

// Configurazione della sessione
app.use(session({
    secret: 'dswdSDDSQ2fddsCWD',  // Chiave segreta per firmare la sessione (modifica in produzione!)
    resave: false,               // Evita di salvare la sessione se non è modificata
    saveUninitialized: false     // Evita di salvare sessioni vuote
}));

// Middleware per rendere l'username disponibile in tutte le view
app.use((req, res, next) => {
    res.locals.username = req.session.username;  // Se presente, l'username della sessione diventa disponibile nelle view
    next();
});

// Configurazione per servire file statici (CSS, immagini, ecc.) dalla cartella "public"
app.use(express.static(path.join(__dirname, 'public')));

// Configurazione di multer per gestire l'upload dei file nelle cartelle "public/uploads"
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Specifica la cartella di destinazione per i file caricati
        cb(null, path.join(__dirname, 'public', 'uploads'));
    },
    filename: function (req, file, cb) {
        // Crea un nome univoco per il file usando data e un numero casuale
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});
const upload = multer({ storage }); // Inizializza multer con la configurazione definita

// Percorsi dei file JSON per salvare gli utenti e i post
const usersFile = path.join(__dirname, 'users.json');
const postsFile = path.join(__dirname, 'posts.json');

// Funzione per leggere gli utenti dal file JSON
function readUsers() {
    if (!fs.existsSync(usersFile)) {
        return []; // Se il file non esiste, ritorna un array vuoto
    }
    const data = fs.readFileSync(usersFile);
    return JSON.parse(data); // Parsifica e ritorna i dati JSON
}

// Funzione per scrivere gli utenti nel file JSON
function writeUsers(users) {
    fs.writeFileSync(usersFile, JSON.stringify(users, null, 2)); // Scrive in modo formattato i dati nel file
}

// Funzione per leggere i post dal file JSON
function readPosts() {
    if (!fs.existsSync(postsFile)) {
        return []; // Se il file non esiste, ritorna un array vuoto
    }
    const data = fs.readFileSync(postsFile);
    return JSON.parse(data); // Parsifica e ritorna i dati JSON
}

// Funzione per scrivere i post nel file JSON
function writePosts(posts) {
    fs.writeFileSync(postsFile, JSON.stringify(posts, null, 2)); // Scrive i dati formattati nel file
}

// Rotta per la home page
app.get('/', (req, res) => {
    const posts = readPosts();              // Legge tutti i post dal file JSON
    const users = readUsers();              // Legge tutti gli utenti (per mostrare le foto profilo)
    const username = req.session.username;  // Ottiene l'username della sessione corrente
    // Ordina i post in ordine decrescente (post più recenti per primi)
    posts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // Renderizza la view 'index' passando post, users e username
    res.render('index', { posts, users, username });
});

// Rotta per visualizzare la pagina di login
app.get('/login', (req, res) => {
    res.render('login');
});

// Gestione del login
app.post('/login', (req, res) => {
    const { username, password } = req.body;       // Estrae username e password dal form
    const users = readUsers();                      // Legge gli utenti dal file JSON
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
        req.session.username = user.username;       // Salva l'username nella sessione
        res.redirect('/');                           // Reindirizza alla home page
    } else {
        res.send('Credenziali non valide. <a href="/login">Riprova</a>');
    }
});

// Rotta per visualizzare la pagina di registrazione
app.get('/signup', (req, res) => {
    res.render('signup');
});

// Gestione della registrazione
app.post('/signup', upload.single('profileImage'), (req, res) => {
    const { username, password } = req.body;        // Estrae username e password dal form
    let users = readUsers();                          // Legge gli utenti dal file JSON

    // Controlla se l'utente esiste già
    if (users.find(u => u.username === username)) {
        return res.send('Utente già esistente. <a href="/signup">Riprova</a>');
    }
    
    // Controlla se un file (foto profilo) è stato caricato
    if (req.file) {
        console.log('File caricato:', req.file);
    } else {
        console.log('Nessun file caricato.');
    }
    
    // Se il file è stato caricato, ottiene il percorso dell'immagine
    let profileImagePath = null;
    if (req.file) {
        profileImagePath = '/uploads/' + req.file.filename;
    }

    // Aggiunge l'utente con i dati e la foto del profilo (se presente)
    users.push({ 
        username, 
        password, 
        profileImage: profileImagePath || null 
    });

    writeUsers(users);  // Salva gli utenti aggiornati
    res.send('Registrazione effettuata con successo. <a href="/login">Accedi</a>');
});

// Rotta per aggiornare la foto profilo
// GET: Mostra il form per aggiornare la foto profilo
app.get('/update-profile', (req, res) => {
    res.render('update-profile');
});

// POST: Gestisce l'upload di una nuova foto profilo
app.post('/update-profile', upload.single('profileImage'), (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }

    const username = req.session.username;          // Ottiene l'username dalla sessione
    const users = readUsers();                         // Legge gli utenti dal file JSON
    const userIndex = users.findIndex(u => u.username === username); // Trova l'indice dell'utente

    if (userIndex === -1) {
        return res.send('Utente non trovato.');
    }

    // Se un file viene caricato, aggiorna il percorso della foto profilo
    if (req.file) {
        users[userIndex].profileImage = '/uploads/' + req.file.filename;
    }

    writeUsers(users);  // Salva le modifiche nel file JSON
    res.redirect('/');
});

// Rotta per creare un nuovo post
// Utilizza multer per gestire il file "image" inviato dal form
app.post('/post', upload.single('image'), (req, res) => {
    if (!req.session.username) {
        return res.send('Devi effettuare il login per poter postare. <a href="/login">Login</a>');
    }

    const { content } = req.body;  // Estrae il contenuto del post
    let imagePath = null;
    if (req.file) {
        imagePath = '/uploads/' + req.file.filename; // Ottiene il percorso dell'immagine del post
    }

    // Se non viene inserito né contenuto né immagine, reindirizza semplicemente alla home
    if (!content && !imagePath) {
        return res.redirect('/');
    }

    let posts = readPosts();       // Legge i post dal file JSON
    const id = Date.now();         // Genera un ID unico basato sul timestamp

    // Aggiunge il nuovo post all'array
    posts.push({
        id,
        content,
        image: imagePath,
        createdAt: new Date().toISOString(), // Data di creazione del post
        author: req.session.username,         // Autore (prende l'username dalla sessione)
        likes: 0,
        dislikes: 0,
        likedBy: [],
        dislikedBy: [],
        rating: [],
        comments: []                           // Inizialmente, nessun commento
    });

    writePosts(posts); // Salva i post aggiornati
    res.redirect('/');
});

// Rotta per aggiungere un commento a un post
app.post('/comment/:id', (req, res) => {
    const id = parseInt(req.params.id, 10);   // Converte l'ID del post in numero
    const commentText = req.body.comment;       // Ottiene il testo del commento dal form
    const author = req.session.username;        // Imposta l'autore del commento

    let posts = readPosts();                    // Legge i post
    const post = posts.find(p => p.id === id);    // Cerca il post con l'ID corrispondente

    if (!post) {
        return res.status(404).send('Post non trovato'); // Se il post non esiste, invia un messaggio di errore
    }

    // Aggiunge il commento all'array dei commenti del post
    post.comments.push({ author, text: commentText });
    writePosts(posts);  // Salva i post aggiornati
    res.redirect('/');
});

// Rotta per aggiungere una recensione (voto in stelle) a un post
app.post('/rate/:id', (req, res) => {
    if (!req.session.username) {
        return res.redirect('/login');
    }

    const id = parseInt(req.params.id);        // Converte l'ID in numero
    const rating = parseInt(req.body.rating);      // Ottiene il voto in stelle dal form
    const user = req.session.username;           // Imposta l'utente che ha votato

    let posts = readPosts();                     // Legge i post
    const post = posts.find(p => p.id === id);     // Cerca il post con l'ID fornito

    if (!post) return res.redirect('/');

    // Verifica se l'utente ha già votato per questo post
    const alreadyRated = post.rating.some(r => r.user === user);
    if (alreadyRated) return res.redirect('/');

    // Aggiunge il voto (recensione) al post
    post.rating.push({ user, stars: rating });
    writePosts(posts); // Salva i post aggiornati
    res.redirect('/');
});

// Rotta per gestire il like a un post
app.post('/like/:id', (req, res) => {
    if (!req.session.username) {
        return res.send('Effettua il login per votare. <a href="/login">Login</a>');
    }

    let posts = readPosts();
    const id = parseInt(req.params.id);         // Converte l'ID del post in numero
    const post = posts.find(p => p.id === id);     // Cerca il post corrispondente

    if (!post) return res.redirect('/');

    const user = req.session.username;           // Ottiene l'username dalla sessione

    // Gestione del like:
    // Se l'utente ha già messo like, lo toglie
    if (post.likedBy.includes(user)) {
        post.likes--;
        post.likedBy = post.likedBy.filter(u => u !== user);
    } else {
        // Se l'utente aveva messo dislike, lo toglie
        if (post.dislikedBy.includes(user)) {
            post.dislikes--;
            post.dislikedBy = post.dislikedBy.filter(u => u !== user);
        }
        // Aggiunge il like
        post.likes++;
        post.likedBy.push(user);
    }

    writePosts(posts); // Salva i post aggiornati
    res.redirect('/');
});

// Rotta per gestire il dislike a un post
app.post('/dislike/:id', (req, res) => {
    if (!req.session.username) {
        return res.send('Effettua il login per votare. <a href="/login">Login</a>');
    }

    let posts = readPosts();
    const id = parseInt(req.params.id);        // Converte l'ID del post in numero
    const post = posts.find(p => p.id === id);    // Cerca il post corrispondente

    if (!post) return res.redirect('/');

    const user = req.session.username;          // Ottiene l'username dalla sessione

    // Gestione del dislike:
    // Se l'utente ha già messo dislike, lo toglie
    if (post.dislikedBy.includes(user)) {
        post.dislikes--;
        post.dislikedBy = post.dislikedBy.filter(u => u !== user);
    } else {
        // Se l'utente aveva messo like, lo toglie
        if (post.likedBy.includes(user)) {
            post.likes--;
            post.likedBy = post.likedBy.filter(u => u !== user);
        }
        // Aggiunge il dislike
        post.dislikes++;
        post.dislikedBy.push(user);
    }

    writePosts(posts); // Salva i post aggiornati
    res.redirect('/');
});

// Rotta per il logout: distrugge la sessione e reindirizza alla home
app.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

// Avvio del server sulla porta specificata
app.listen(PORT, () => {
    console.log(`Server in esecuzione su http://localhost:${PORT}`);
});
