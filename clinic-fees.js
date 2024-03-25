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

  const [priceDataResponse, locDataResponse, enrolmentLocDataResponse] = await Promise.all([
    fetchData(endpoints.PriceList),
    fetchData(endpoints.Locations),
    fetchData(endpoints.EnrolmentLocations)
  ]);
  
  // Correctly accessing nested data
  const locData = locDataResponse.data;
  const enrolmentLocData = enrolmentLocDataResponse.data;
  const priceData = priceDataResponse.data;

  const locMap = enrolmentLocData.marketingEnrolmentLocations.reduce((acc, loc) => {
    acc[loc.id] = loc.name;
    return acc;
  }, {});

  const ageMap = {
   'ChildUnder14': 'Under 14 yrs',
   'Youth14to17': '14-17 yrs', 
   'Adult18to24': '18-24 yrs', 
   'Adult25to64': '25-64 yrs',
   'Adult25OrOver':'25+ yrs',
   'Adult65OrOver': '65+ yrs', 
   'NoRequirement': 'N/A'
  };

  const containers = {
   "Enrolled": "enrolled",
   "Enrolled (CSC)": "csc",
   "Casual": "casual"
  };

  const generateTable = (locId, items, tableName = '') => {
    const locName = locMap[locId] || "Online";

    const isAgeSpecific = tableName === "Enrolled" || tableName === "Enrolled (CSC)";

    const isCSC = tableName.includes("CSC");

    let availableGroups;

    if (isAgeSpecific) {
      if (tableName.includes("CSC")) {
        availableGroups = ['Youth14to17', 'NoRequirement'];
      } else {
        // Determine if there are items specifically for 'Adult25to64' or 'Adult25OrOver'
        const hasAdult25to64 = items.some(i => i.ageRequirement === 'Adult25to64');
        const hasAdult25OrOver = items.some(i => i.ageRequirement === 'Adult25OrOver');

        // Initially assume 'Adult25to64' is the relevant category
        let ageGroups = ['ChildUnder14', 'Youth14to17', 'Adult18to24', 'Adult25to64', 'Adult65OrOver'];

        // If there are no 'Adult25to64' items but there are 'Adult25OrOver' items, use 'Adult25OrOver' instead
        if (!hasAdult25to64 && hasAdult25OrOver) {
          ageGroups = ['ChildUnder14', 'Youth14to17', 'Adult18to24', 'Adult25OrOver'];
        }

        // Filter available groups based on the presence of items for each age group
        availableGroups = ageGroups.filter(age => items.some(i => i.ageRequirement === age));
      }
    } else {
      availableGroups = ['AllAges'];
    }

    const groupedItems = items.reduce((acc, item) => {
    const commonDesc = extractDesc(item);
    const duration = item.marketingDuration ? item.marketingDuration.toString() : "null";
    const key = `${commonDesc}:::${duration}`;
    
    if (item.ageRequirement === 'NoRequirement' && isAgeSpecific && !tableName.includes("CSC")) {
      // For items with no specific age requirement, add them to each age group category
      availableGroups.forEach(age => {
        acc[key] = { ...(acc[key] || {}), [age]: item };
      });
    } else {
      acc[key] = { ...(acc[key] || {}), [item.ageRequirement]: item };
    }
    
    return acc;
    }, {});

  const widthAutoClass = !isAgeSpecific || isCSC ? 'width-auto' : '';

  let table = `<div class="flex-table ${widthAutoClass}">`;

	// Header 
  table += `<div class="flex-row header">`;
  table += `<div class="flex-cell header-first heading-style-h6 text-color-purple">Service</div>`;
  table += `${availableGroups.map((age, index) => {
    let additionalClasses = index === 0 ? 'start' : '';
    additionalClasses += index === availableGroups.length - 1 ? ' rounded-top-right last' : '';
    
    // Determine display text based on the age group and table name
    let displayAge;
    if (age === 'AllAges') {
      displayAge = 'All Ages'; // Direct handling for non-age-specific tables
    } else if (tableName.includes("CSC") && age === 'NoRequirement') {
      displayAge = '18+ yrs'; // Special case for CSC table with "NoRequirement"
    } else {
      displayAge = ageMap[age]; // Standard case using ageMap
    }

    if (isCSC) {
      additionalClasses += ' csc-max-width';
    }

    return `<div class="flex-cell header-age heading-style-h6 text-color-purple ${additionalClasses}">${displayAge}</div>`;
  }).join('')}</div>`;

  const entries = Object.entries(groupedItems);
  table += `${entries.map(([key, group], rowIndex) => {
    const [description, duration] = key.split(':::');
    const durationText = duration !== 'null' ? ` (${duration} mins)` : '';

    const isLastRow = rowIndex === entries.length - 1;
    const isFirstRow = rowIndex === 0;
    const isOnlyRow = entries.length === 1;

    const rowClass = isOnlyRow ? 'end first' : (isLastRow ? 'end' : (isFirstRow ? 'first' : ''));

    const cells = availableGroups.map((age, ageIndex) => {
      // Define additionalClasses here, within the map function
      let additionalClasses = '';
      if (isFirstRow) additionalClasses += ' first';
      if (ageIndex === 0) additionalClasses += ' start';
      if (ageIndex === availableGroups.length - 1) additionalClasses += ' last';
      if (isLastRow) additionalClasses += ' end';
      if (isOnlyRow && ageIndex === 0) additionalClasses += ' first';
      if (isLastRow && ageIndex === availableGroups.length - 1) additionalClasses += ' rounded-bottom-right';

      if (isCSC) {
        additionalClasses += ' csc-max-width'; // Adding .csc-max-width for CSC tables
      }

      // Check if we have a specific item for this age group.
      let item = group[age];

      // If there's no specific item for this age group or if the specific item is "NoRequirement"...
      if (!item || item.ageRequirement === 'NoRequirement') {
          // If there's a "NoRequirement" item, use it.
          item = group['NoRequirement'];
      }

      // Now that we have the right item, determine the price.
      let price;
      if (item) {
        // If there's a specific item for this age group, use its price
        price = item.amountInCents === 0 ? 'Free' : `$${item.amountInCents / 100}`;
      } else {
        // If there's no specific item for this age group, try to find a "NoRequirement" item
        const noRequirementItem = group['NoRequirement'];
        price = noRequirementItem ? (noRequirementItem.amountInCents === 0 ? 'Free' : `$${noRequirementItem.amountInCents / 100}`) : 'N/A';
      }
      //const price = item ? (item.amountInCents === 0 ? 'Free' : `$${item.amountInCents / 100}`) : 'N/A';

      // Use additionalClasses to build the cell
      return `<div class="flex-cell price text-size-regular ${additionalClasses}">${price}</div>`;
    }).join('');

    const firstCellClass = isFirstRow && !isLastRow ? 'start' : (isLastRow ? 'start rounded-bottom-left' : '');

    return `<div class="flex-row ${rowClass}"><div class="flex-cell first ${firstCellClass}">${description} <span class="text-size-regular text-color-grey">${durationText}</span></div>${cells}</div>`;
  }).join('')}</div>`;

	// Get the container for this table type
  let containerId = containers[tableName];
  if (containerId) {
    let containerElement = document.querySelector(`.clinics-pricing-wrapper .${containerId}`);
    if (containerElement) {
      containerElement.innerHTML = table;
    } else {
      console.warn(`Container with class ${containerId} not found.`);
    }
  } else {
   console.warn(`No container defined for table type: ${tableName}`);
  }
  };

  const categorizePriceList = (priceListData) => {
    const enrolled = [];
    const enrolledCsc = [];
    const casual = [];

    for (let item of priceListData) {
     if ((item.membershipRequirement === "ENROLLED" || item.membershipRequirement === "NO_REQUIREMENT") && !item.requiresCommunityServicesCard && (item.itemCategory === "Consultation" || item.itemCategory === "RepeatPrescription")) {
      enrolled.push(item);
    } else if (item.membershipRequirement === "ENROLLED" && item.requiresCommunityServicesCard && (item.itemCategory === "Consultation" || item.itemCategory === "RepeatPrescription")) {
      enrolledCsc.push(item);
    } else if (item.membershipRequirement === "CASUAL" && item.itemCategory === "Consultation") {
      casual.push(item);
    }
  }

  return { enrolled, enrolledCsc, casual };
  };

  const locationGroupedPriceData = priceData.marketingPriceList
  .reduce((acc, item) => {
    item.enrolmentLocationIds.forEach(locId => {
      if (!acc[locId]) acc[locId] = [];
      acc[locId].push(item);
   });
    return acc;
  }, {});

  const desiredLocationData = { [desiredLocationId]: locationGroupedPriceData[desiredLocationId] };
  if (!desiredLocationData[desiredLocationId]) {
    console.warn(`No data found for location ID: ${desiredLocationId}`);
    return;
  }

  Object.entries(desiredLocationData).forEach(([locId, items]) => {
    const categorizedData = categorizePriceList(items);

    if (categorizedData.enrolled.length) generateTable(locId, categorizedData.enrolled, "Enrolled");
    if (categorizedData.enrolledCsc.length) generateTable(locId, categorizedData.enrolledCsc, "Enrolled (CSC)");
    if (categorizedData.casual.length) generateTable(locId, categorizedData.casual, "Casual");
  });
});
