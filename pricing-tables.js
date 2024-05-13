document.addEventListener("DOMContentLoaded", () => {
  // Asynchronously fetches data and handles errors
  const fetchData = async () => {
    try {
      const response = await axios.get('https://api.tend.nz/marketing/price-grid');
      // Check for a successful response status, otherwise throw an error
      if (response.status !== 200) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      console.log("Data fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error("Failed to fetch data:", error);
      // Return null in case of an error to handle it gracefully later
      return null;
    }
  };

  // Filters categories based on a specified type
  const filterCategoriesByType = (categories, type) => {
    return categories.filter(category => category.category === type);
  };

  // Generates HTML for a table based on category data and age mappings
  const generateTable = (categories, ageMap, isCscTable = false, isEnrolled = false) => {
    let tableClass = 'flex-table';
    if (!isEnrolled) {
      // Add 'width-auto' class for non-enrolled tables for specific styling
      tableClass += ' width-auto';
    }

    // Initialise a dictionary to store which ages need to be displayed
    const displayAges = {};
    // Populate displayAges based on whether there is relevant price info
    Object.keys(ageMap).forEach(ageKey => {
      displayAges[ageKey] = categories.some(category => {
        const priceInfo = category.prices.find(price => price.ageGroup === ageKey);
        return priceInfo && priceInfo.priceInCents !== undefined;
      });
    });

    // Filter and count columns that will be displayed
    const ageKeys = Object.keys(ageMap).filter(ageKey => displayAges[ageKey]);
    const numberOfColumns = 1 + ageKeys.length; // Includes the service column
    tableClass += ` ${numberOfColumns}-col`; // Add class indicating number of columns

    let html = `<div class="${tableClass}">`;

    // Construct the header row
    html += '<div class="flex-row header">';
    let headerServiceCellClass = "flex-cell header-first heading-style-h6 text-color-purple";
    if (isCscTable) headerServiceCellClass += " csc-max-width";
    html += `<div class="${headerServiceCellClass}">Service</div>`;
    ageKeys.forEach((ageKey, keyIndex) => {
      let headerCellClass = "flex-cell header-age heading-style-h6 text-color-purple";
      if (isCscTable) headerCellClass += " csc-max-width";
      if (keyIndex === ageKeys.length - 1) headerCellClass += " rounded-top-right last";
      html += `<div class="${headerCellClass}">${ageMap[ageKey]}</div>`;
    });
    html += '</div>'; // Close header row

    // Generate rows for each category with corresponding price information
    categories.forEach((category, index) => {
      const isLastRow = index === categories.length - 1;
      let rowClass = isLastRow ? "flex-row end" : "flex-row";

      html += `<div class="${rowClass}">`;
      html += `<div class="flex-cell first${isLastRow ? ' rounded-bottom-left' : ''}">${category.description}`;
      if (category.duration > 0) {
        html += ` <span class="text-size-regular text-color-grey">(${category.duration} mins)</span>`;
      }
      html += '</div>';

      ageKeys.forEach((ageKey, keyIndex) => {
        const priceInfo = category.prices.find(price => price.ageGroup === ageKey);
        let price = 'N/A';
        let cellClass = "flex-cell price text-size-regular";
        if (isCscTable) cellClass += " csc-max-width";
        if (keyIndex === 0) cellClass += " start";
        if (isLastRow) cellClass += " end";
        if (keyIndex === ageKeys.length - 1) {
          cellClass += " last";
          if (isLastRow) {
            cellClass += " rounded-bottom-right";
          }
        }
        if (priceInfo) {
          price = priceInfo.priceInCents === 0 ? "Free" : (Number.isInteger(priceInfo.priceInCents / 100) ? `$${priceInfo.priceInCents / 100}` : `$${(priceInfo.priceInCents / 100).toFixed(2)}`);
        }
        html += `<div class="${cellClass}">${price}</div>`;
      });

      html += '</div>'; // Close data row
    });

    html += '</div>'; // Close pricing table
    return html;
  };

  // Initialises pricing tables for a selected location
  window.initializePricingTables = async (selectedLocationId) => {
    const rawData = await fetchData();
    if (rawData) {
      const locationData = rawData.data.find(location => location.locationId === selectedLocationId);
      if (locationData) {
        console.log("Found data for location:", locationData.name);
        const enrolledCategories = filterCategoriesByType(locationData.categories, 'ENROLLED');
        const cscCategories = filterCategoriesByType(locationData.categories, 'CSC');
        const casualCategories = filterCategoriesByType(locationData.categories, 'CASUAL');
        const servicesCategories = filterCategoriesByType(locationData.categories, 'SERVICES');

        const ageMap = {
          'Child4': 'Under 4 yrs',
          'ChildUnder14': 'Under 14 yrs',
          'Youth14to17': '14-17 yrs',
          'Youth16to18': '16-18 yrs',
          'Under18': 'Under 18 yrs',
          'Adult18to24': '18-24 yrs',
          'Adult18OrOver': '18+ yrs',
          'Adult25OrOver': '25+ yrs',
          'Adult25to64': '25-64 yrs',
          'Adult25to44': '25-44 yrs',
          'Adult45to64': '45-64 yrs',
          'Adult65OrOver': '65+ yrs',
          'NoRequirement': 'All Ages'
        };

        // Populate each container with the appropriate HTML table
        const enrolledContainer = document.getElementById('enrolledPricingContainer');
        const cscContainer = document.getElementById('cscPricingContainer');
        const casualContainer = document.getElementById('casualPricingContainer');
        const servicesContainer = document.getElementById('servicesPricingContainer');

        if (enrolledContainer) {
          enrolledContainer.innerHTML = generateTable(enrolledCategories, ageMap, false, true);
        } else {
          console.log("Enrolled pricing container not found.");
        }

        if (cscContainer) {
        // CSC tables receive specific formatting
        cscContainer.innerHTML = generateTable(cscCategories, ageMap, true);
        } else {
          console.log("CSC pricing container not found.");
        }

        if (casualContainer) {
          casualContainer.innerHTML = generateTable(casualCategories, ageMap);
        } else {
          console.log("Casual pricing container not found.");
        }

        if (servicesContainer) {
          servicesContainer.innerHTML = generateTable(servicesCategories, ageMap);
        } else {
          console.log("Services pricing container not found.");
        }

      } else {
        console.log("No data found for the specified location ID.");
      }
    } else {
      console.log("No data received from fetch.");
    }
  };
});
