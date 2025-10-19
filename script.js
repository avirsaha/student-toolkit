document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('search-box');
    const allToolCards = document.querySelectorAll('.tool-card');

    // 1. Create a searchable list from your HTML tool cards
    // This way, you don't have to manually create a list in JS.
    const tools = Array.from(allToolCards).map((card, index) => {
        // We use an index to uniquely identify each card later.
        card.setAttribute('data-index', index); 
        return {
            index: index,
            title: card.querySelector('h2').textContent.trim(),
            description: card.querySelector('p').textContent.trim()
        };
    });

    // 2. Configure Fuse.js for fuzzy searching
    const options = {
        // The `keys` are the properties in your `tools` array to search through.
        keys: ['title', 'description'],
        // `threshold` controls how "fuzzy" the search is. 0.0 is a perfect match, 1.0 matches anything. 
        // A value around 0.4 is usually a good balance.
        threshold: 0.4, 
    };

    const fuse = new Fuse(tools, options);

    // 3. Set up the search event listener
    searchBox.addEventListener('input', (event) => {
        const searchTerm = event.target.value;

        // If the search box is empty, show all the cards and exit.
        if (searchTerm.trim() === '') {
            allToolCards.forEach(card => {
                card.style.display = 'flex';
            });
            return;
        }

        // Perform the fuzzy search
        const results = fuse.search(searchTerm);
        
        // Create a set of indices for the tools that matched the search
        const visibleIndices = new Set(results.map(result => result.item.index));

        // Show or hide cards based on the search results
        allToolCards.forEach(card => {
            const cardIndex = parseInt(card.getAttribute('data-index'), 10);
            if (visibleIndices.has(cardIndex)) {
                card.style.display = 'flex'; // Show matching card
            } else {
                card.style.display = 'none'; // Hide non-matching card
            }
        });
    });
});
