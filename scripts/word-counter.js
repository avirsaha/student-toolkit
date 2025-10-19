document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');

    // Stat display elements
    const wordCountEl = document.getElementById('word-count');
    const charCountEl = document.getElementById('char-count');
    const sentenceCountEl = document.getElementById('sentence-count');
    const paragraphCountEl = document.getElementById('paragraph-count');
    const readingTimeEl = document.getElementById('reading-time');
    const speakingTimeEl = document.getElementById('speaking-time');
    const readabilityEl = document.getElementById('readability');
    const keywordListEl = document.getElementById('keyword-list');
    const avgSentenceLengthEl = document.getElementById('avg-sentence-length');
    const longestSentenceEl = document.getElementById('longest-sentence');
    const uniqueWordsEl = document.getElementById('unique-words');

    // List of common English "stop words" to ignore in keyword analysis
    const stopWords = new Set([
        'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
    ]);
    
    textInput.addEventListener('input', () => {
        analyzeText(textInput.value);
    });

    function analyzeText(text) {
        // --- Basic Counts ---
        const words = text.match(/\b\w+\b/g) || [];
        const wordCount = words.length;
        const charCount = text.length;
        const sentences = text.split(/[.!?]+(?=\s|$)/).filter(s => s.trim().length > 0);
        const sentenceCount = sentences.length;
        const paragraphs = text.split(/\n+/).filter(p => p.trim().length > 0);
        const paragraphCount = paragraphs.length;

        wordCountEl.textContent = wordCount;
        charCountEl.textContent = charCount;
        sentenceCountEl.textContent = sentenceCount;
        paragraphCountEl.textContent = paragraphCount;

        // --- Time Estimates ---
        const wordsPerMinuteReading = 225;
        const readingTimeMinutes = Math.ceil(wordCount / wordsPerMinuteReading);
        readingTimeEl.textContent = `~ ${readingTimeMinutes} min`;

        const wordsPerMinuteSpeaking = 150;
        const speakingTimeMinutes = Math.ceil(wordCount / wordsPerMinuteSpeaking);
        speakingTimeEl.textContent = `~ ${speakingTimeMinutes} min`;

        // --- Readability (Flesch-Kincaid Grade Level) ---
        if (wordCount > 0 && sentenceCount > 0) {
            const totalSyllables = words.reduce((acc, word) => acc + countSyllables(word), 0);
            const gradeLevel = 0.39 * (wordCount / sentenceCount) + 11.8 * (totalSyllables / wordCount) - 15.59;
            readabilityEl.textContent = `~ Grade ${Math.max(0, Math.round(gradeLevel))}`;
        } else {
            readabilityEl.textContent = `~ Grade 0`;
        }
        
        // --- Sentence Analysis ---
        const avgSentenceLength = (wordCount > 0 && sentenceCount > 0) ? (wordCount / sentenceCount).toFixed(1) : 0;
        avgSentenceLengthEl.textContent = `${avgSentenceLength} words`;

        const sentenceLengths = sentences.map(s => (s.match(/\b\w+\b/g) || []).length);
        const longestSentenceLength = sentenceLengths.length > 0 ? Math.max(...sentenceLengths) : 0;
        longestSentenceEl.textContent = `${longestSentenceLength} words`;
        
        // --- Vocabulary Analysis ---
        const uniqueWords = new Set(words.map(w => w.toLowerCase()));
        uniqueWordsEl.textContent = uniqueWords.size;


        // --- Keyword Frequency ---
        const wordFrequencies = {};
        const cleanedWords = text.toLowerCase().match(/\b[a-z]+\b/g) || [];
        
        cleanedWords.forEach(word => {
            if (!stopWords.has(word)) {
                wordFrequencies[word] = (wordFrequencies[word] || 0) + 1;
            }
        });

        const sortedKeywords = Object.entries(wordFrequencies).sort((a, b) => b[1] - a[1]);
        
        keywordListEl.innerHTML = ''; // Clear previous list
        if (sortedKeywords.length > 0) {
            sortedKeywords.slice(0, 5).forEach(([word, count]) => {
                const li = document.createElement('li');
                li.innerHTML = `<span class="word">${word}</span><span class="count">${count}</span>`;
                keywordListEl.appendChild(li);
            });
        } else {
            keywordListEl.innerHTML = `<li class="placeholder">Your most used words will appear here...</li>`;
        }
    }

    // Heuristic-based syllable counting function (good enough for this purpose)
    function countSyllables(word) {
        word = word.toLowerCase();
        if (word.length <= 3) return 1;
        word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
        word = word.replace(/^y/, '');
        const syllables = word.match(/[aeiouy]{1,2}/g);
        return syllables ? syllables.length : 1;
    }
});


