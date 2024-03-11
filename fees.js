document.addEventListener("DOMContentLoaded", async () => {

  const endpoints = {
    "Locations": "https://api.tend.nz/marketing/locations",
    "EnrolmentLocations": "https://api.tend.nz/marketing/enrolment-locations",
    "PriceList": "https://api.tend.nz/marketing/price-list"
  };

  const fetchData = async (url) => {
    try {
      const res = await axios.get(url, { headers: { 'Accept': 'application/json' } });
      console.log("Fetched data from", url, res.data); // Check the fetched data
      return res.data;
    } catch (e) {
      console.error("Error fetching from", url, e);
      return undefined; // Explicitly return undefined on error
    }
  };

  const extractDesc = item => {
    const desc = item.marketingDescription || item.description || "";
    return desc;
  };

  function toTitleCase(str) {
    return str.replace(/\w\S*/g, function(txt) {
      return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
  }

  const [locData, enrolmentLocData, priceData] = await Promise.all([
    fetchData(endpoints.Locations),
    fetchData(endpoints.EnrolmentLocations),
    fetchData(endpoints.PriceList)
  ]);

  console.log({ locData, enrolmentLocData, priceData }); // This should show the structure of each

  function formatRegionName(regionName) {
    return regionName.replace(/_/g, ' ');
  }

  const clinicToRegionMap = locData.data.marketingLocations.reduce((acc, loc) => {
    acc[loc.id] = formatRegionName(loc.region);
    return acc;
  }, {});

  const locMap = enrolmentLocData.data.marketingEnrolmentLocations.reduce((acc, loc) => {
    acc[loc.id] = `${loc.displayName} (${clinicToRegionMap[loc.clinicLocationId] || 'Unknown Region'})`;
    return acc;
  }, {});

  const ageMap = {
    'ChildUnder14': 'Under 14 yrs',
    'Youth14to17': '14-17 yrs', 
    'Adult18to24': '18-24 yrs', 
    'Adult25to64': '25-64 yrs', 
    'Adult65OrOver': '65+ yrs', 
    'NoRequirement': 'N/A'
  };

  // Correct access to the nested array before sorting
  const sortedEnrolmentLocations = enrolmentLocData.data.marketingEnrolmentLocations.sort((a, b) => {
    if (a.displayName < b.displayName) return -1;
    if (a.displayName > b.displayName) return 1;
    return 0;
  });

  const dropdown = document.querySelector('.list-items');
  sortedEnrolmentLocations.forEach(loc => {
    const listItem = document.createElement('div');
    listItem.classList.add('item');
    const checkboxField = document.createElement('div');
    checkboxField.classList.add('checkbox-field');
    const checkbox = document.createElement('input');
    checkbox.classList.add('checkbox', 'our-fees-hidden');
    checkbox.type = 'checkbox';
    const itemText = document.createElement('div');
    itemText.classList.add('item-text');
    const rawRegion = clinicToRegionMap[loc.clinicLocationId] || 'unknown region';
    const region = toTitleCase(rawRegion);
    itemText.textContent = `${loc.displayName} (${region})`;
    checkboxField.appendChild(checkbox);
    checkboxField.appendChild(itemText);
    listItem.appendChild(checkboxField);
    listItem.dataset.locId = loc.id;
    dropdown.appendChild(listItem);
  });

  const dropdownEvent = new Event('DropdownPopulated');
  document.dispatchEvent(dropdownEvent);

  const generateTable = (locId, items, tableName = '') => {
    const locName = locMap[locId];     
    if (!locName) {
      console.error(`Error: locId ${locId} is not found in locMap. Please verify the data.`);
    }
    let isAgeSpecific = tableName === 'Consultations';
    let availableGroups;
    let containerId = '';

    switch (tableName) {
      case 'Consultations':
        containerId = 'pricingTablesContainerEnrolled';
        isAgeSpecific = true;
        break;
      case 'Services':
        containerId = 'pricingTablesContainerService';
        break;
      case 'Consultations (Casual)':
        containerId = 'pricingTablesContainerCasual';
        break;
      case 'Consultations (CSC)':
        containerId = 'pricingTablesContainerCSC';
        isAgeSpecific = true; // Ensure CSC tables are treated as age-specific
        break;
      default:
        break;
    }

    if (isAgeSpecific) {
      if (tableName === 'Consultations (CSC)') {
        // For CSC tables, map "Youth14to17" directly and handle "NoRequirement" specially
        availableGroups = ['Youth14to17', 'NoRequirement']; // Use existing ageMap keys
      } else {
        // Original logic for non-CSC, age-specific tables
        const ageGroups = ['ChildUnder14', 'Youth14to17', 'Adult18to24', 'Adult25to64', 'Adult65OrOver'];
        availableGroups = ageGroups.filter(age => items.some(i => i.ageRequirement === age || i.ageRequirement === 'NoRequirement'));
      }
    } else {
      availableGroups = ['AllAges'];
    }

    const groupedItems = items.reduce((acc, i) => {
      const commonDesc = extractDesc(i);
      const duration = i.marketingDuration ? i.marketingDuration.toString() : "null";
      const key = `${commonDesc}:::${duration}`;
      acc[key] = { ...(acc[key] || {}), [i.ageRequirement]: i };
      return acc;
    }, {});

    const widthAutoClass = !isAgeSpecific ? 'width-auto' : '';

    let table = `<div class="flex-table ${widthAutoClass}" data-location="${locId}">`;
    // Header row
    table += `<div class="flex-row header"><div class="flex-cell header-first heading-style-h6 text-color-purple">Service</div>`;
    table += `${availableGroups.map((age, index) => {
      let additionalClasses = index === 0 ? 'start' : '';
      additionalClasses += index === availableGroups.length - 1 ? ' rounded-top-right last' : '';

      // Determine display text based on the age group and table name
      let displayAge;
      if (age === 'AllAges') {
        displayAge = 'All Ages'; // Direct handling for non-age-specific tables
      } else if (tableName === 'Consultations (CSC)' && age === 'NoRequirement') {
        displayAge = '18+ yrs'; // Special case for CSC table with "NoRequirement"
      } else {
        displayAge = ageMap[age]; // Standard case using ageMap
      }

      return `<div class="flex-cell header-age heading-style-h6 text-color-purple ${additionalClasses}">${displayAge}</div>`;
    }).join('')}</div>`;
      

    const entries = Object.entries(groupedItems);
    table += `${entries.map(([key, group], rowIndex) => {
      const [description, duration] = key.split(':::');
      const durationText = duration !== 'null' ? ` (${duration} mins)` : '';        const isLastRow = rowIndex === entries.length - 1;
      const isFirstRow = rowIndex === 0;
      const isOnlyRow = entries.length === 1;
      const rowClass = isOnlyRow ? 'end first' : (isLastRow ? 'end' : (isFirstRow ? 'first' : ''));
      const cells = availableGroups.map((age, index) => {
        let additionalClasses = '';
        if (isFirstRow) additionalClasses += ' first';
        if (index === 0) additionalClasses += ' start';
        if (index === availableGroups.length - 1) additionalClasses += ' last';
        if (isLastRow) additionalClasses += ' end';
        if (isOnlyRow && index === 0) additionalClasses += ' first';
        if (isLastRow && index === availableGroups.length - 1) additionalClasses += ' rounded-bottom-right';
        const item = group[age] || (isAgeSpecific ? group['NoRequirement'] : Object.values(group)[0]);
        const price = item ? (item.amountInCents === 0 ? 'Free' : `$${item.amountInCents / 100}`) : 'N/A';
        return `<div class="flex-cell price text-size-regular ${additionalClasses}">${price}</div>`;
      }).join('');
      const firstCellClass = isFirstRow && !isLastRow ? 'start' : (isLastRow ? 'start rounded-bottom-left' : '');
      return `<div class="flex-row ${rowClass}"><div class="flex-cell first ${firstCellClass}">${description} <span class="text-size-regular text-color-grey">${durationText}</span></div>${cells}</div>`;
    }).join('')}</div>`;

    document.getElementById(containerId).insertAdjacentHTML('afterbegin', table);

    const widthAutoTables = document.querySelectorAll('.flex-table.width-auto');

    widthAutoTables.forEach(table => {
      let parentContainer = table.parentElement;
      while (parentContainer && !parentContainer.classList.contains('our-fees-pricing-spacing')) {
        parentContainer = parentContainer.parentElement;
      }
      if (parentContainer) {
        parentContainer.classList.add('width-auto');
      }
    });

  };

  const locationGroupedPriceData = priceData.data.marketingPriceList.reduce((acc, item) => {
    item.enrolmentLocationIds.forEach(locId => {
      if(!acc[locId]) acc[locId] = [];
      acc[locId].push(item);
    });
    return acc;
  }, {});

  Object.entries(locationGroupedPriceData).forEach(([locId, items]) => {
    const notCasualItems = items.filter(i => i.membershipRequirement !== "CASUAL");
    const consultationItems = notCasualItems.filter(i => (i.itemCategory === "Consultation" || i.itemCategory === "RepeatPrescription") && i.requiresCommunityServicesCard === false && (i.membershipRequirement === "ENROLLED" || i.membershipRequirement === "NO_REQUIREMENT"));
    const serviceItems = notCasualItems.filter(i => i.itemCategory === "Service" && (i.membershipRequirement === "ENROLLED" || i.membershipRequirement === "NO_REQUIREMENT"));
    const casualItems = items.filter(i => i.membershipRequirement === "CASUAL" && i.itemCategory === "Consultation");
    const cscEnrolledItems = items.filter(i => (i.membershipRequirement === "ENROLLED" || i.itemCategory === "RepeatPrescription") && i.requiresCommunityServicesCard === true);
    if(consultationItems.length) generateTable(locId, consultationItems, "Consultations");
    if(serviceItems.length) generateTable(locId, serviceItems, "Services");
    if(casualItems.length) generateTable(locId, casualItems, "Consultations (Casual)");
    if(cscEnrolledItems.length) generateTable(locId, cscEnrolledItems, "Consultations (CSC)");
  });

  const tablesEvent = new Event('TablesPopulated');

  document.dispatchEvent(tablesEvent);

});