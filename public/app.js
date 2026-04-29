document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const brandInput = document.getElementById('brand-input');
    const searchBtn = document.getElementById('search-btn');
    const randomBtn = document.getElementById('random-btn');
    
    const statusContainer = document.getElementById('status-container');
    const statusText = document.getElementById('status-text');
    
    const resultsContainer = document.getElementById('results-container');
    const resultsTitle = document.getElementById('results-title');
    const resultsCount = document.getElementById('results-count');
    const dealsGrid = document.getElementById('deals-grid');
    const dealCardTemplate = document.getElementById('deal-card-template');

    // UI State Management
    function setLoading(isLoading, text = 'Scraping Amazon...') {
        if (isLoading) {
            statusText.textContent = text;
            statusContainer.classList.remove('hidden');
            resultsContainer.classList.add('hidden');
            searchBtn.disabled = true;
            randomBtn.disabled = true;
            brandInput.disabled = true;
        } else {
            statusContainer.classList.add('hidden');
            searchBtn.disabled = false;
            randomBtn.disabled = false;
            brandInput.disabled = false;
        }
    }

    function renderDeals(deals, title) {
        dealsGrid.innerHTML = '';
        resultsTitle.textContent = title;
        resultsCount.textContent = `${deals.length} Deals`;

        if (deals.length === 0) {
            dealsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No deals found. Try another brand.</p>';
            resultsContainer.classList.remove('hidden');
            return;
        }

        deals.forEach(deal => {
            const clone = dealCardTemplate.content.cloneNode(true);
            const card = clone.querySelector('.deal-card');
            
            card.href = deal.link;
            clone.querySelector('.deal-title').textContent = deal.title;
            clone.querySelector('.deal-brand').textContent = deal.brand;
            
            const imgEl = clone.querySelector('.deal-image');
            if (deal.imageUrl) {
                imgEl.src = deal.imageUrl;
            } else {
                imgEl.style.display = 'none';
            }
            
            clone.querySelector('.current-price').textContent = `$${deal.currentPrice.toFixed(2)}`;
            clone.querySelector('.list-price').textContent = `$${deal.listPrice.toFixed(2)}`;
            clone.querySelector('.discount-value').textContent = deal.discount;

            dealsGrid.appendChild(clone);
        });

        resultsContainer.classList.remove('hidden');
    }

    // Event Listeners
    searchForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const query = brandInput.value.trim();
        if (!query) return;

        // Split by commas for multiple brands if needed, but for simplicity let's treat it as one query string
        const brands = query.split(',').map(b => b.trim()).filter(b => b);

        setLoading(true, `Searching for ${brands.join(', ')}...`);

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brands, limit: 15 })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to search');
            }

            renderDeals(data.deals, `Results for "${brands.join(', ')}"`);
            brandInput.value = '';
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    });

    randomBtn.addEventListener('click', async () => {
        setLoading(true, 'Selecting random brands...');

        try {
            // Step 1: Select the random brands
            const selectRes = await fetch('/api/random/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ numBrands: 3 })
            });

            const selectData = await selectRes.json();

            if (!selectRes.ok) {
                if (selectData.action === 'delete_tracker') {
                    alert('All brands have been searched this week! Delete the tracking file to restart.');
                } else {
                    throw new Error(selectData.error || 'Failed to select random brands');
                }
                setLoading(false);
                return;
            }

            const { brands } = selectData;
            
            // Update loading state with the selected brands
            setLoading(true, `Scraping Amazon for: ${brands.join(', ')}...`);

            // Step 2: Scrape those brands using the existing search endpoint
            const searchRes = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ brands, limit: 15 })
            });

            const searchData = await searchRes.json();

            if (!searchRes.ok) {
                throw new Error(searchData.error || 'Failed to run random search');
            }

            const title = `Random Search: ${brands.join(', ')}`;
            renderDeals(searchData.deals, title);
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setLoading(false);
        }
    });
});
