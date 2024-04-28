document.addEventListener("DOMContentLoaded", () => {

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

  const filterCategoriesByType = (categories, type) => {
    return categories.filter(category => category.category === type);
  };

  const generateTable = (categories, ageMap, isCscTable = false, isEnrolled = false) => {
    let tableClass = 'flex-table';
    if (!isEnrolled) {
      tableClass += ' width-auto';
    }

    let html = `<div class="${tableClass}">`;

    // Determine which age columns should be displayed
    const displayAges = {};
    Object.keys(ageMap).forEach(ageKey => {
      displayAges[ageKey] = categories.some(category => {
        const priceInfo = category.prices.find(price => price.ageGroup === ageKey);
        return priceInfo && priceInfo.priceInCents !== undefined;
      });
    });

    // Header row
    html += '<div class="flex-row header">';
    let headerServiceCellClass = "flex-cell header-first heading-style-h6 text-color-purple";
    if (isCscTable) headerServiceCellClass += " csc-max-width";
    html += `<div class="${headerServiceCellClass}">Service</div>`;
    const ageKeys = Object.keys(ageMap).filter(ageKey => displayAges[ageKey]);
    ageKeys.forEach((ageKey, keyIndex) => {
      let headerCellClass = "flex-cell header-age heading-style-h6 text-color-purple";
      if (isCscTable) headerCellClass += " csc-max-width";
      if (keyIndex === ageKeys.length - 1) {
        headerCellClass += " rounded-top-right last";
      }
      html += `<div class="${headerCellClass}">${ageMap[ageKey]}</div>`;
    });
    html += '</div>'; // Close header row

    // Data rows
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
          'ChildUnder14': 'Under 14 yrs',
          'Youth14to17': '14-17 yrs',
          'Adult18to24': '18-24 yrs',
          'Adult25OrOver': '25+ yrs',
          'Adult25to64': '25-64 yrs',
          'Adult65OrOver': '65+ yrs',
          'NoRequirement': 'All Ages'
        };

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
        // Passing true as the third argument for the CSC table
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
