document.addEventListener("DOMContentLoaded", async () => {

  // Asynchronously fetches data and handles errors
  const fetchData = async () => {
    try {
      const response = await axios.get('https://api.tend.nz/marketing/price-grid');
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Data fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch data:", error);
      return null;
    }
  };

  // Formats region names into Title Case after replacing underscores with spaces
  function formatRegionName(regionName) {
    return regionName
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b[a-z]/g, char => char.toUpperCase());
  };

  const data = await fetchData();
  if (!data) {
    console.error("No data received from fetch.");
    return;
  }

  // Sorts locations alphabetically by region and then by name
  const sortedLocations = data.data.sort((a, b) => {
    const regionA = a.region.toUpperCase(); 
    const regionB = b.region.toUpperCase(); 
    if (regionA < regionB) return -1;
    if (regionA > regionB) return 1;
    return a.name.toUpperCase().localeCompare(b.name.toUpperCase());
  });

  const dropdown = document.querySelector('.list-items');
  const dropdownButton = document.getElementById('dropdownButton'); // Ensures correct ID is used

  sortedLocations.forEach(location => {
    const formattedRegion = formatRegionName(location.region);
    const listItem = document.createElement('div');
    listItem.className = 'item';
    listItem.dataset.locId = location.locationId;

    const checkboxField = document.createElement('div');
    checkboxField.className = 'checkbox-field';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'checkbox our-fees-hidden';

    const itemText = document.createElement('div');
    itemText.className = 'item-text';
    itemText.textContent = `${location.name} (${formattedRegion})`;

    checkboxField.appendChild(checkbox);
    checkboxField.appendChild(itemText);
    listItem.appendChild(checkboxField);
    dropdown.appendChild(listItem);
  });

  // Sets the first item as the default selected if available
  const firstItem = dropdown.querySelector('.item');
  if (firstItem) {
    const btnTextElement = dropdownButton.querySelector('.btn-text');
    btnTextElement.textContent = firstItem.querySelector('.item-text').textContent;

    // Initialises pricing tables or other elements with the first location ID
    window.initializePricingTables(firstItem.dataset.locId);
  }

  // Toggles the dropdown open or closed on button click
  dropdownButton.addEventListener('click', () => {
    const isExpanded = dropdownButton.classList.contains('open');
    closeAllListsExcept(-1, [dropdownButton], dropdown);
    dropdown.classList.toggle('open', !isExpanded);
    dropdownButton.classList.toggle('open', !isExpanded);
    dropdownButton.querySelector('.drop-arrow').classList.toggle('rotate', !isExpanded);
  });

  // Closes all dropdowns if clicked outside of any dropdown element
  document.addEventListener('click', event => {
    if (!event.target.closest('.select-btn') && !event.target.closest('.list-items')) {
      closeAllListsExcept(-1, [dropdownButton], dropdown);
    }
  });

  // Updates the button text and initializes pricing tables when a new location is selected
  dropdown.addEventListener('click', event => {
    const locId = event.target.closest('.item')?.dataset.locId;
    if (locId) {
      const btnTextElement = dropdownButton.querySelector('.btn-text');
      btnTextElement.textContent = event.target.closest('.item').querySelector('.item-text').textContent;
      window.initializePricingTables(locId);
      closeAllListsExcept(-1, [dropdownButton], dropdown);
    }
  });
});

// Closes all dropdowns except the one specified
function closeAllListsExcept(exceptIndex, selectButtons, dropdown) {
  selectButtons.forEach((button, index) => {
    if (index !== exceptIndex && button.classList.contains('open')) {
      button.classList.remove('open');
      dropdown.classList.remove('open');
      button.querySelector('.drop-arrow').classList.remove('rotate');
    }
  });
}
